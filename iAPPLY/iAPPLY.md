# 01‑Contract.md — Core ⇄ Plugin Contract (v0.2)

**Purpose**: ระบุสัญญาระหว่าง Core, UI, และ Plugin (เช่น Q1‑3) ให้พัฒนาร่วมกันได้แบบแยกส่วน โดยไม่ต้องเดา

## Namespaces

* `IAF.ui` — ทูลบาร์และอีเวนต์จากผู้ใช้ (มีอยู่แล้ว)
* `IAF.registry` — ลงทะเบียน/เรียกใช้ปลั๊กอินตามหน้าที่ตรวจเจอ
* `IAF.core` — orchestration + undo + logger + normalizers + runtime hooks
* `IAF.dom` — helper ฝั่ง DOM (typeLikeUser, fire input/change/blur, select/radio/checkbox helpers)

## Plugin API

ปลั๊กอิน 1 ตัว คืออ็อบเจ็กต์ที่ลงทะเบียนผ่าน `IAF.registry.register(plugin)` โดยมีโครงสร้างดังนี้

```js
{
  id: "q1_3",                // slug ของหน้า
  label: "Q1‑3",             // ชื่อที่แสดงใน UI dropdown (อนาคต)
  api: { minCore: "0.2.0" },  // เวอร์ชัน Core ขั้นต่ำที่รองรับ

  detect(): boolean,           // true เมื่ออยู่หน้าเป้าหมาย (อย่าอิง _ngcontent)

  // ตรวจและสรุปว่าจะกรอกอะไรบ้าง (ไม่แตะ DOM)
  dryRun(profile, ctx): {
    page: "Q1‑3",
    summary: { ok: number, skip: number, warn: number },
    items: Array<{ key, selector, type, valuePreview, note? }>,
    schemaErrors?: string[]
  },

  // กรอกจริง (ต้อง dispatch input/change/blur ให้ครบ)
  fill(profile, ctx): Promise<{ ok: number, fail: number, notes?: string[] }>
}
```

### `ctx` (Context จาก Core → Plugin)

```ts
interface Ctx {
  safeMode: boolean;          // true = กรอกเฉพาะช่องว่าง
  dom: IAF.dom;               // helper DOM ทั้งหมด
  undo: { snapshot(el:HTMLElement): void; restoreAll(): Promise<void>; };
  log:  (msg:string) => void; // เพิ่มข้อความลง logs ของ UI
  schema: {                   // ตัวช่วยตรวจสคีมา (optional ใน v0.2)
    validate(profile:any): { ok:boolean, errors:string[] };
    version: string;          // "0.2"
  }
}
```

### Error & Logging Semantics

* ปลั๊กอิน **ห้าม throw** ชุดใหญ่โดยไม่จับ ให้ส่งกลับเป็นผลลัพธ์ `fail` พร้อม `notes`
* ถ้า schema ไม่ผ่าน → `dryRun` ควรคืน `schemaErrors` และ Core จะตั้ง Status เป็น `Blocked (schema errors)`
* ทุก action สำคัญให้เรียก `ctx.log` เพื่อโชว์รายละเอียดใน UI → Logs

### Lifecycle & Data Flow

1. ผู้ใช้อัปโหลด JSON → `IAF.ui` emits `json:loaded`
2. Core ตรวจ schema (ถ้ามี) และเลือกปลั๊กอินด้วย `IAF.registry.findActive()`
3. กด **Preview** → core เรียก `plugin.dryRun(profile, ctx)` → แสดงรายการ mapping
4. กด **Fill Now** → core เรียก `plugin.fill(profile, ctx)`
5. ผู้ใช้ **Undo / Clear** → core จัดการจากข้อมูล snapshot ที่บันทึกตอนกรอก

---

# 02‑Schema_Q1‑3.md — JSON Schema & Example (v0.2)

> **หลักการ**: เก็บข้อมูลเชิงธุรกิจเป็นกลางหน้าให้มากที่สุด ไม่อิง selector ของหน้าเว็บ, ใช้รูปแบบ **canonical** สำหรับวันที่/เบอร์/เพศ แล้วปลั๊กอินไป normalize/format เพิ่มเติมเอง

## Canonical Rules

* **Date**: `YYYY-MM-DD` (เช่น `1990-05-17`) — ปลั๊กอินจะแปลงเป็น `DD/MM/YYYY` เมื่อช่องเป็น `type=text`
* **Phone**: `^0\d{9}$` (10 หลัก) — ไม่มีขีด/ช่องว่าง
* **Gender**: `"ชาย" | "หญิง"` (ยอมรับ input จากไฟล์เป็น `ชาย/หญิง/M/F` แล้ว normalize)
* **Postcode**: 5 หลัก `^\d{5}$`

## JSON Schema (ย่อแบบ Draft‑7 style)

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "title": "iAPPLY Q1-3 Profile v0.2",
  "type": "object",
  "required": ["meta", "applicant", "addresses", "occupation"],
  "properties": {
    "meta": {
      "type": "object",
      "required": ["version", "page"],
      "properties": {
        "version": { "const": "0.2" },
        "page": { "const": "q1_3" }
      }
    },

    "applicant": {
      "type": "object",
      "required": ["identity"],
      "properties": {
        "identity": {
          "type": "object",
          "required": ["firstName", "lastName", "idType", "idNumber"],
          "properties": {
            "title": { "type": ["string", "null"] },
            "firstName": { "type": "string", "minLength": 1 },
            "lastName": { "type": "string", "minLength": 1 },
            "fullName": { "type": ["string", "null"] },
            "gender": { "type": ["string", "null"], "enum": ["ชาย", "หญิง", null] },
            "birthDate": { "type": ["string", "null"], "pattern": "^\\d{4}-\\d{2}-\\d{2}$" },
            "idType": { "type": "string", "enum": ["TH_CITIZEN", "PASSPORT", "OTHER"] },
            "idNumber": { "type": "string", "minLength": 5 },
            "phone": { "type": ["string", "null"], "pattern": "^0\\d{9}$" },
            "email": { "type": ["string", "null"] }
          }
        }
      }
    },

    "addresses": {
      "type": "object",
      "required": ["registered"],
      "properties": {
        "currentAddressSameAsRegistered": { "type": "boolean", "default": false },
        "workplaceSameAsRegisteredForStudent": { "type": "boolean", "default": false },
        "registered": { "$ref": "#/definitions/address" },
        "current":   { "$ref": "#/definitions/address" },
        "work":      { "$ref": "#/definitions/workAddress" }
      }
    },

    "occupation": {
      "type": "object",
      "required": ["type"],
      "properties": {
        "type": { "type": "string", "enum": ["EMPLOYEE", "SELF_EMPLOYED", "STUDENT", "HOUSEWORK", "RETIRED", "OTHER"] },
        "position": { "type": ["string", "null"] },
        "employerName": { "type": ["string", "null"] },
        "industry": { "type": ["string", "null"] },
        "incomeMonthly": { "type": ["number", "string", "null"] },
        "incomeAnnual":  { "type": ["number", "string", "null"] }
      }
    }
  },
  "definitions": {
    "address": {
      "type": "object",
      "properties": {
        "houseNo": { "type": ["string", "null"] },
        "moo": { "type": ["string", "null"] },
        "soi": { "type": ["string", "null"] },
        "road": { "type": ["string", "null"] },
        "subdistrict": { "type": ["string", "null"] },
        "district": { "type": ["string", "null"] },
        "province": { "type": ["string", "null"] },
        "postcode": { "type": ["string", "null"], "pattern": "^\\d{5}$" },
        "country": { "type": ["string", "null"], "default": "Thailand" }
      }
    },
    "workAddress": { "$ref": "#/definitions/address" }
  }
}
```

## Example JSON (ครบฟิลด์หลัก Q1‑3)

```json
{
  "meta": { "version": "0.2", "page": "q1_3" },
  "applicant": {
    "identity": {
      "title": "นาย",
      "firstName": "สมชาย",
      "lastName": "ใจดี",
      "gender": "ชาย",
      "birthDate": "1990-05-17",
      "idType": "TH_CITIZEN",
      "idNumber": "1101700203450",
      "phone": "0812345678",
      "email": "somchai@example.com"
    }
  },
  "addresses": {
    "currentAddressSameAsRegistered": true,
    "workplaceSameAsRegisteredForStudent": false,
    "registered": {
      "houseNo": "123/45",
      "moo": "8",
      "soi": "สุขใจ 2",
      "road": "สุขุมวิท",
      "subdistrict": "คลองตัน",
      "district": "คลองเตย",
      "province": "กรุงเทพมหานคร",
      "postcode": "10110",
      "country": "Thailand"
    },
    "current": {
      "houseNo": "99/1",
      "soi": "เอกมัย 4",
      "road": "เอกมัย",
      "subdistrict": "พระโขนง",
      "district": "วัฒนา",
      "province": "กรุงเทพมหานคร",
      "postcode": "10110"
    },
    "work": {
      "houseNo": "55",
      "road": "พระราม 4",
      "district": "คลองเตย",
      "province": "กรุงเทพมหานคร",
      "postcode": "10110"
    }
  },
  "occupation": {
    "type": "EMPLOYEE",
    "position": "เจ้าหน้าที่อาวุโส",
    "employerName": "ABC Co., Ltd.",
    "industry": "Insurance",
    "incomeMonthly": 85000,
    "incomeAnnual": 1020000
  }
}
```

---

# 03‑Mapping_Q1‑3.md — Selectors & Rules (Draft v0.2)

> เป้าหมาย: ให้ระบุ **ลำดับ selector** ที่เสถียรที่สุดก่อน (หลีกเลี่ยง `_ngcontent`, `_nghost`) และระบุ **วิธี normalize + event** ต่อฟิลด์

## Guideline (ลำดับ selector ที่ลองตามนี้)

1. `[formcontrolname="..."]`
2. `[data-testid="..."]`
3. `input[name="..."], select[name="..."], textarea[name="..."]`
4. `label:contains("ข้อความบนหน้าจอ")` → หา input ภายในกล่องเดียวกัน (ใช้ traversal ภายในปลั๊กอิน)
5. Fallback by placeholder/aria‑label

> หมายเหตุ: ถ้าหน้า Q1‑3 มีคีย์เฉพาะ (เช่น `formcontrolname="firstname"`) ให้ใช้เป็น **Primary** ได้ทันที

## ตาราง Mapping (ตัวอย่างชุดหลัก)

| Section    | fieldKey                                        | Type         | Primary Selector                                | Fallbacks                                           | Normalizer                                | Events              |
| ---------- | ----------------------------------------------- | ------------ | ----------------------------------------------- | --------------------------------------------------- | ----------------------------------------- | ------------------- |
| Identity   | `applicant.identity.title`                      | select/text  | `[formcontrolname="title"]`                     | `[name="title"]`, label:"คำนำหน้า"                  | map(นาย/นาง/น.ส.)                         | input→change→blur   |
| Identity   | `applicant.identity.firstName`                  | text         | `[formcontrolname="firstName"]`                 | `[name="firstName"]`, label:"ชื่อ"                  | trim                                      | input→change→blur   |
| Identity   | `applicant.identity.lastName`                   | text         | `[formcontrolname="lastName"]`                  | `[name="lastName"]`, label:"นามสกุล"                | trim                                      | input→change→blur   |
| Identity   | `applicant.identity.gender`                     | radio/select | `[formcontrolname="gender"]`                    | group by `name=gender`                              | normalize(ชาย/หญิง/M/F)                   | click or set+change |
| Identity   | `applicant.identity.birthDate`                  | date/text    | `input[type=date][formcontrolname="birthDate"]` | label:"วันเกิด"                                     | to `YYYY-MM-DD` หรือ `DD/MM/YYYY` ตามชนิด | input→change→blur   |
| Identity   | `applicant.identity.idType`                     | select       | `[formcontrolname="idType"]`                    | `[name="idType"]`                                   | enum(TH_CITIZEN/PASSPORT/OTHER)           | change              |
| Identity   | `applicant.identity.idNumber`                   | text         | `[formcontrolname="idNumber"]`                  | label:"เลขบัตร", `[name="citizenId"]`               | digitsOnly                                | input→change→blur   |
| Contact    | `applicant.identity.phone`                      | text         | `[formcontrolname="phone"]`                     | label:"โทรศัพท์"                                    | pattern ^0\d{9}$                          | input→change→blur   |
| Contact    | `applicant.identity.email`                      | text         | `[formcontrolname="email"]`                     | label:"อีเมล"                                       | lowercase/trim                            | input→change→blur   |
| Addr Flags | `addresses.currentAddressSameAsRegistered`      | checkbox     | `[name="addrSameReg"]`                          | label:"2.2 ที่อยู่ปัจจุบัน ใช้ตามทะเบียนบ้าน"       | boolean                                   | click               |
| Addr Flags | `addresses.workplaceSameAsRegisteredForStudent` | checkbox     | `[name="workSameRegForStudent"]`                | label:"2.3 สถานที่ทำงาน/นักเรียน ใช้ตามทะเบียนบ้าน" | boolean                                   | click               |
| Registered | `addresses.registered.houseNo`                  | text         | `[formcontrolname="reg_houseNo"]`               | label:"บ้านเลขที่"                                  | trim                                      | input→change→blur   |
| Registered | `addresses.registered.soi`                      | text         | `[formcontrolname="reg_soi"]`                   | label:"ตรอก/ซอย"                                    | trim                                      | input→change→blur   |
| Registered | `addresses.registered.road`                     | text         | `[formcontrolname="reg_road"]`                  | label:"ถนน"                                         | trim                                      | input→change→blur   |
| Registered | `addresses.registered.subdistrict`              | text/select  | `[formcontrolname="reg_subdistrict"]`           | `[name="reg_subdistrict"]`                          | exact text                                | change              |
| Registered | `addresses.registered.district`                 | text/select  | `[formcontrolname="reg_district"]`              | `[name="reg_district"]`                             | exact text                                | change              |
| Registered | `addresses.registered.province`                 | text/select  | `[formcontrolname="reg_province"]`              | `[name="reg_province"]`                             | exact text                                | change              |
| Registered | `addresses.registered.postcode`                 | text         | `[formcontrolname="reg_postcode"]`              | `[name="reg_postcode"]`                             | ^\d{5}$                                   | input→change→blur   |
| Current    | `addresses.current.*`                           | text/select  | เหมือน `reg_*` แต่ `cur_*`                      | —                                                   | ตามชนิด                                   | ตามชนิด             |
| Work       | `addresses.work.*`                              | text/select  | เหมือน `reg_*` แต่ `work_*`                     | —                                                   | ตามชนิด                                   | ตามชนิด             |
| Occupation | `occupation.type`                               | select       | `[formcontrolname="occupationType"]`            | `[name="occupationType"]`                           | enum                                      | change              |
| Occupation | `occupation.position`                           | text         | `[formcontrolname="position"]`                  | label:"ตำแหน่ง"                                     | trim                                      | input→change→blur   |
| Occupation | `occupation.employerName`                       | text         | `[formcontrolname="employerName"]`              | label:"สถานที่ทำงาน"                                | trim                                      | input→change→blur   |
| Occupation | `occupation.industry`                           | select/text  | `[formcontrolname="industry"]`                  | `[name="industry"]`                                 | map if coded                              | change              |
| Occupation | `occupation.incomeMonthly`                      | text         | `[formcontrolname="incomeMonthly"]`             | label:"รายได้/เดือน"                                | digitsOnly                                | input→change→blur   |
| Occupation | `occupation.incomeAnnual`                       | text         | `[formcontrolname="incomeAnnual"]`              | label:"รายได้/ปี"                                   | digitsOnly                                | input→change→blur   |

> **หมายเหตุ**: ชื่อ `formcontrolname`/`name` ในตารางเป็น **ตัวอย่าง** เพื่อกำหนดรูปแบบการเขียน mapping; ตอนลงมือจริงให้แทนค่าด้วยของจริงจาก DOM Q1‑3 และเพิ่ม fallback ตามที่ตรวจพบ

## กติกาพิเศษ

* ถ้า `addresses.currentAddressSameAsRegistered = true` → **ไม่กรอก**กลุ่ม `addresses.current.*` และติ๊กช่องในหน้า
* ถ้า `workplaceSameAsRegisteredForStudent = true` และ `occupation.type` ∈ {`STUDENT`} → **ไม่กรอก**กลุ่ม `addresses.work.*`
* `safeMode = true` → กรอกเฉพาะช่องที่ว่าง (`value===''`)

---

# 04‑Test_Matrix_Q1‑3.md — Test Plan (v0.2)

## A. Smoke

1. โหลดหน้า Q1‑3 → UI แสดง `Page: Q1‑3`, Status `waiting for JSON`
2. อัปโหลดไฟล์ตัวอย่าง valid → Status `JSON ready`; Logs แสดง preview โครง JSON
3. กด **Preview** → Logs แสดง mapping summary มีรายการช่องครบ; ไม่มี `schemaErrors`
4. กด **Fill Now** → Status `Complete`; ช่องถูกกรอกครบ; Undo/ Clear (changed/page) เปิดใช้งาน

## B. Safe Mode

* **ON**: ใส่ค่า manual บางช่องก่อน → กด Fill → ช่องที่มีค่าอยู่แล้ว **ไม่ถูกทับ**
* **OFF**: ช่องเดิมถูกทับด้วยค่าจาก JSON

## C. Flags 2.2 / 2.3

* 2.2 = true → ช่อง current address **ไม่ถูกกรอก** และติ๊ก checkbox ในหน้า
* 2.3 = true (และ type=STUDENT) → ช่อง work address **ไม่ถูกกรอก** และติ๊ก checkbox

## D. Select/Radio/Checkbox Behavior

* เพศ = ชาย/หญิง/M/F → radio/select ถูกเลือกถูกต้อง
* จังหวัด/อำเภอ/ตำบลแบบ select → เลือกได้ทั้งตาม `value` และตาม **text** ถ้า `value` ไม่ตรง (fallback)

## E. Validation/Schema Errors

* ลบ `applicant.identity.idNumber` → Preview ต้องขึ้น `schemaErrors` และ Status = `Blocked (schema errors)`
* เบอร์โทรผิดรูปแบบ → ปลั๊กอินแปลง/แจ้งเตือนใน Logs (ไม่ล้ม)

## F. Undo / Clear

* Fill → Undo → ค่าที่สคริปต์เปลี่ยนต้องย้อนกลับทั้งหมด, ของผู้ใช้ที่กรอกก่อนหน้า **ไม่โดนแก้**
* Clear (changed) → ล้างเฉพาะที่สคริปต์เพิ่งเปลี่ยน
* Clear (page) → ล้างทั้งหน้าปัจจุบัน (ยืนยันก่อน)

## G. SPA / Re-render

* เปลี่ยนหน้าไป/กลับ Q อื่น ๆ (ไม่รีเฟรช) → Toolbar ยังอยู่ใต้ navbar
* Re-detect plugin แล้ว Fill ได้ตามปกติ

## H. Edge

* วันเกิด `YYYY-MM-DD` / `DD/MM/YYYY` → รองรับทั้งคู่ (ทดสอบ input type=text/date)
* ชื่อ/สกุลมีช่องว่างพิเศษ → trim แล้วกรอกถูก
* Postcode 5 หลัก; กว่า/น้อยกว่านี้ต้องแจ้งเตือนใน Logs

---

**Definition of Done (DoD) — Q1‑3 v0.2**

* Preview แสดงรายการ mapping ครบและถูกต้อง ≥ 95% ของช่องทั้งหมดในหน้า
* Fill สำเร็จไม่มี error ร้ายแรง (ok/fail ≥ 95/≤ 5)
* Safe Mode/Undo/Clear ทำงานตามสเปก
* Test Matrix ผ่านครบทุกหมวด A–H

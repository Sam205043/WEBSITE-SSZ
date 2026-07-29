# Firestore Data Model — Soft Skill Zone ERP

All collections are top-level (flat). Flat beats nested here because the Admin ERP
needs cross-student queries (all pending fees, today's attendance, all admissions).

Legend: `T` = Firestore Timestamp, `→` = reference by document ID (string, not DocumentReference).

---

## `users/{uid}`
The single source of truth for **who you are and what you may do**. Document ID = Firebase Auth UID.

| Field | Type | Notes |
|---|---|---|
| role | string | `student` \| `admin` \| `faculty` |
| name | string | |
| email | string | |
| phone | string | |
| studentId | string | → `students` doc id (students only) |
| status | string | `active` \| `blocked` |
| photoURL | string | Storage download URL |
| createdAt | T | |
| lastLoginAt | T | |

---

## `admissions/{autoId}`
Raw online admission applications. Written by the public form, read only by admin.

| Field | Type | Notes |
|---|---|---|
| applicationNo | string | `SSZ-APP-2026-0001` |
| fullName, fatherName, motherName | string | |
| dob | string | `YYYY-MM-DD` |
| gender | string | `male` \| `female` \| `other` |
| mobile, whatsapp, email | string | |
| address, city, pincode | string | |
| qualification | string | |
| courseId | string | → `courses` |
| courseName | string | denormalised for fast admin listing |
| batchId | string | → `batches` |
| photoURL | string | Storage URL |
| documents | array\<{name,url,type,size}\> | Aadhaar, marksheet, etc. |
| status | string | `pending` \| `approved` \| `rejected` |
| isRead | boolean | drives the admin unread badge |
| remarks | string | admin note on rejection |
| studentId | string | filled when approved |
| createdAt, updatedAt | T | |

---

## `students/{studentId}`
Created when an admission is **approved**. Document ID = generated Student ID, e.g. `SSZ2026DCA0007`.

| Field | Type | Notes |
|---|---|---|
| uid | string | → `users` (Firebase Auth UID) |
| studentId | string | same as doc ID |
| rollNo | string | |
| admissionId | string | → `admissions` |
| fullName, fatherName, motherName | string | |
| dob, gender, mobile, whatsapp, email, address | | |
| qualification | string | |
| courseId, courseName | string | |
| batchId, batchName | string | |
| photoURL | string | |
| documents | array | |
| admissionDate | T | |
| status | string | `active` \| `completed` \| `dropped` |
| totalFee, paidFee, pendingFee | number | maintained on every fee entry |
| nextDueDate | T | |
| createdAt, updatedAt | T | |

---

## `courses/{courseId}`
Slug IDs: `ai-dca`, `ai-tally-prime`, `python-314`, `adca`, `ai-video-editing`,
`icom`, `bcom`, `gst-2`, `income-tax-2025`, `tds-finance-2025`.

| Field | Type |
|---|---|
| title, shortTitle, slug | string |
| tagline, description | string |
| durationMonths | number |
| fee, admissionFee | number |
| level | string (`beginner`\|`intermediate`\|`advanced`) |
| category | string (`ai`\|`accounts`\|`programming`\|`academic`\|`taxation`\|`creative`) |
| modules | array\<{title, topics[]}\> |
| highlights, eligibility, careerOptions | array\<string\> |
| certificate | string |
| image, icon, colorFrom, colorTo | string |
| isPopular, isNew, isActive | boolean |
| seats, enrolled | number |
| order | number |

---

## `batches/{batchId}`

| Field | Type |
|---|---|
| batchId, name | string (`DCA-MOR-JAN26`) |
| courseId, courseName | string |
| facultyId, facultyName | string |
| startDate, endDate | T |
| timing | string (`08:00 AM - 09:30 AM`) |
| days | array\<string\> |
| mode | string (`offline`\|`online`\|`hybrid`) |
| capacity, enrolled | number |
| status | string (`upcoming`\|`running`\|`completed`) |

---

## `fees/{autoId}`
One document per **transaction** (not per student). Student totals live on the student doc.

| Field | Type |
|---|---|
| receiptNo | string (`SSZ/RCPT/2026/0001`) |
| studentId, studentName, courseName, batchId | string |
| amount | number |
| mode | string (`cash`\|`upi`\|`razorpay`\|`bank`\|`cheque`) |
| razorpayLink, txnRef | string |
| installmentNo | number |
| paidOn | T |
| collectedBy | string (admin uid) |
| status | string (`paid`\|`pending-verification`\|`failed`) |
| proofURL | string (payment screenshot uploaded by student) |
| remarks | string |
| createdAt | T |

---

## `attendance/{autoId}`
One document per **student per day** — makes both the student view and the batch
register a single indexed query.

| Field | Type |
|---|---|
| date | string `YYYY-MM-DD` (queryable without timezone pain) |
| batchId, courseId, studentId, studentName | string |
| status | string (`present`\|`absent`\|`late`\|`leave`) |
| markedBy | string |
| createdAt | T |

---

## `liveClasses/{autoId}`

| Field | Type |
|---|---|
| title, topic, description | string |
| courseId, batchId, batchName | string |
| facultyName | string |
| meetLink | string (Google Meet URL) |
| startsAt, endsAt | T |
| status | string (`scheduled`\|`live`\|`ended`\|`cancelled`) |
| recordingURL | string |
| createdBy, createdAt | |

---

## `assignments/{autoId}`

| Field | Type |
|---|---|
| title, description | string |
| courseId, batchId | string |
| fileURL, fileName | string |
| totalMarks | number |
| dueDate | T |
| createdBy, createdAt | |

## `submissions/{autoId}`

| Field | Type |
|---|---|
| assignmentId, studentId, studentName | string |
| fileURL, fileName | string |
| submittedAt | T |
| status | string (`submitted`\|`graded`\|`late`) |
| marks | number |
| feedback | string |

---

## `notes/{autoId}`

| Field | Type |
|---|---|
| title, description | string |
| courseId, batchId | string |
| fileURL, fileName, fileType, fileSize | |
| downloads | number |
| isPublic | boolean (true = free download for visitors) |
| uploadedBy, createdAt | |

---

## `certificates/{autoId}`

| Field | Type |
|---|---|
| certificateNo | string (`SSZ/CERT/2026/0042`) |
| studentId, studentName, courseName | string |
| issueDate, completionDate | T |
| grade, percentage | |
| certificateURL | string (generated PDF in Storage) |
| verifyCode | string (public verification lookup) |
| issuedBy | string |

---

## `notifications/{autoId}`

| Field | Type |
|---|---|
| title, message | string |
| type | string (`general`\|`fee`\|`class`\|`exam`\|`holiday`) |
| audience | string (`all`\|`batch`\|`student`) |
| batchId, studentId | string (when targeted) |
| link | string |
| readBy | array\<string\> (student ids) |
| priority | string (`low`\|`normal`\|`high`) |
| createdBy, createdAt | |

---

## Public-content collections

| Collection | Purpose | Key fields |
|---|---|---|
| `faculty/{id}` | Faculty page | name, designation, subjects[], experience, qualification, photoURL, bio, socials{}, order |
| `reviews/{id}` | Student reviews | studentName, studentId, courseName, rating, message, photoURL, isApproved, createdAt |
| `gallery/{id}` | Gallery | title, category, imageURL, thumbURL, order, createdAt |
| `blog/{slug}` | Blog | title, slug, excerpt, content(HTML), coverURL, author, tags[], isPublished, views, createdAt |
| `faq/{id}` | FAQ | question, answer, category, order |
| `enquiries/{id}` | Contact form | name, mobile, email, subject, message, isRead, createdAt |
| `settings/institute` | Global settings | see FIREBASE-SETUP.md step 7 |
| `counters/{name}` | ID generation | value (number) — used for applicationNo, receiptNo, certificateNo |

---

## Student ID format

```
SSZ + YYYY + COURSECODE + 4-digit sequence
SSZ2026DCA0007
```
Generated in a Firestore transaction against `counters/students-2026` so two
simultaneous approvals can never collide.

## Storage layout

```
students/{studentId}/photo.jpg
students/{studentId}/documents/{fileName}
admissions/{applicationNo}/photo.jpg
admissions/{applicationNo}/docs/{fileName}
notes/{courseId}/{fileName}
assignments/{assignmentId}/{fileName}
submissions/{assignmentId}/{studentId}/{fileName}
certificates/{certificateNo}.pdf
fees/proofs/{studentId}/{fileName}
public/gallery/{fileName}
public/faculty/{fileName}
public/blog/{fileName}
```

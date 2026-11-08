# PAY-1432: Add preferred contact time to the Case 360 contact section

**Repository:** `acme/sf-service-console`
**Component / module:** Case 360 screen / contact section
**Change type:** Config-only

### User story
As a service agent, I want to see the customer's preferred contact time, so that I call them when they are available.

### Acceptance criteria
1. **Given** an agent opens a case **when** the contact section loads **then** "Preferred contact time" is shown directly after Phone
2. **Given** the field is empty **when** the section renders **then** it shows "Not provided"
3. Negative case: **Given** a user without access to the field **when** the section renders **then** the field is hidden

### Sample data / JSON
```json
{
  "type": "section",
  "label": "Contact",
  "fields": [
    { "type": "field", "field": "Case.ContactPhone" },
    { "type": "field", "field": "Case.Preferred_Contact_Time__c", "emptyText": "Not provided" }
  ]
}
```
Expected rendered result: new row under Phone, same style as the other rows.

### Pattern to follow
Similar existing feature: `configs/case360.json` → the existing Phone field entry

### Out of scope
- No changes to the renderer components

### Cross-repo dependencies
- None

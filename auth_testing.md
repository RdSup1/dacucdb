# Auth Testing Playbook

## MongoDB Verification
```
mongosh
use fomerstick_db
db.users.find({role: "admin"}).pretty()
db.users.findOne({role: "admin"}, {password_hash: 1})
```
Verify: bcrypt hash starts with `$2b$`, indexes exist on users.email (unique).

## API Testing
```
BASE=https://premium-gear-hub-5.preview.emergentagent.com
curl -X POST $BASE/api/auth/register -H "Content-Type: application/json" -d '{"email":"user1@test.com","password":"test1234","name":"User One"}'
curl -X POST $BASE/api/auth/login -H "Content-Type: application/json" -d '{"email":"admin@fomerstick.com","password":"admin123"}'
# Use token returned in response.access_token as Bearer in Authorization header
curl -H "Authorization: Bearer <token>" $BASE/api/auth/me
```

## Test Credentials
- Admin: admin@fomerstick.com / admin123
- Test user (create via register): user1@test.com / test1234

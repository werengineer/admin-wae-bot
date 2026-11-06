// node test/admin-rule.test.mjs : who the login screen accepts (the Admin rule of the resources app)
import { isResourcesAdminEmail, ADMIN_EMAILS } from "../src/admin-rule.ts"
const results = []
const check = (name, ok, extra = "") => { results.push(!!ok); console.log(`${ok ? "PASS" : "FAIL"}  ${name}${extra ? "   " + extra : ""}`) }
check("the listed admin addresses are accepted, also with capitals and spaces", ADMIN_EMAILS.every((e) => isResourcesAdminEmail(e)) && isResourcesAdminEmail("  Admin@WeAreEngineer.com "))
check("any admin@ address is an admin (the resources rule)", isResourcesAdminEmail("admin@somewhere.org"))
check("a franchisee, a trainer, a look-alike and empty values are refused", !isResourcesAdminEmail("trainer@weareengineer.com") && !isResourcesAdminEmail("xadmin@weareengineer.com") && !isResourcesAdminEmail("admin.team@weareengineer.com") && !isResourcesAdminEmail("") && !isResourcesAdminEmail(null) && !isResourcesAdminEmail(undefined))
console.log(`\n${results.filter(Boolean).length}/${results.length} passed`)
process.exit(results.every(Boolean) ? 0 : 1)

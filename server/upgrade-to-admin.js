"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const dotenv_1 = __importDefault(require("dotenv"));
const pg_1 = require("pg");
const bcrypt_1 = __importDefault(require("bcrypt"));
dotenv_1.default.config();
const pool = new pg_1.Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});
function upgradeToAdmin(email, password) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const passwordHash = yield bcrypt_1.default.hash(password, 10);
            const result = yield pool.query('UPDATE users SET role = $1, password_hash = $2 WHERE email = $3 RETURNING id, email, role', ['admin', passwordHash, email]);
            if (result.rows.length === 0) {
                console.log('❌ User not found');
            }
            else {
                console.log('✅ User upgraded to admin successfully:');
                console.log(`  Email: ${result.rows[0].email}`);
                console.log(`  Role: ${result.rows[0].role}`);
                console.log(`  ID: ${result.rows[0].id}`);
            }
        }
        catch (e) {
            console.error('❌ Error:', e.message);
        }
        finally {
            yield pool.end();
        }
    });
}
const email = process.argv[2] || 'kkwilsontech@gmail.com';
const password = process.argv[3] || 'Listen11!';
console.log(`\nUpgrading user to admin...`);
console.log(`  Email: ${email}`);
upgradeToAdmin(email, password);

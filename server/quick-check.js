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
dotenv_1.default.config();
const pool = new pg_1.Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});
function check() {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            console.log('��� Testing DB Connection...');
            const connTest = yield pool.query('SELECT NOW()');
            console.log('✅ Database Connected at:', connTest.rows[0].now);
            console.log('\n��� Checking users table...');
            const users = yield pool.query('SELECT id, email, role FROM users');
            console.log(`Found ${users.rows.length} user(s):`);
            users.rows.forEach(u => console.log(`  - ${u.email} (role: ${u.role})`));
            console.log('\n��� Checking admin users...');
            const admins = yield pool.query('SELECT id, email, role FROM users WHERE role = $1', ['admin']);
            console.log(`Found ${admins.rows.length} admin user(s):`);
            admins.rows.forEach(a => console.log(`  - ${a.email}`));
            yield pool.end();
        }
        catch (e) {
            console.error('❌ Error:', e.message);
            process.exit(1);
        }
    });
}
check();

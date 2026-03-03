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
            console.log('��� Checking allowed_users table (gatekeeper)...');
            const result = yield pool.query('SELECT id, username, created_at FROM allowed_users ORDER BY created_at DESC');
            if (result.rows.length === 0) {
                console.log('❌ No gatekeeper users found');
                console.log('\nTo add gatekeeper users, run:');
                console.log('  npm run add-user youremail@example.com StrongPassword!');
            }
            else {
                console.log(`✅ Found ${result.rows.length} gatekeeper user(s):`);
                result.rows.forEach(u => console.log(`  - ${u.username} (ID: ${u.id})`));
            }
            yield pool.end();
        }
        catch (e) {
            console.error('❌ Error:', e.message);
        }
    });
}
check();

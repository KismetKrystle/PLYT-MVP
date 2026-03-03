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
function createAdmin(email, password) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const passwordHash = yield bcrypt_1.default.hash(password, 10);
            const result = yield pool.query('INSERT INTO users (name, email, password_hash, role) VALUES ($1, $2, $3, $4) RETURNING id, email, role', ['Admin', email, passwordHash, 'admin']);
            console.log('✅ Admin user created successfully:');
            console.log(`  Email: ${result.rows[0].email}`);
            console.log(`  Role: ${result.rows[0].role}`);
            console.log(`  ID: ${result.rows[0].id}`);
        }
        catch (e) {
            console.error('❌ Error creating admin:', e.message);
        }
        finally {
            yield pool.end();
        }
    });
}
const email = process.argv[2] || 'admin@plyt.local';
const password = process.argv[3] || 'admin123';
console.log(`\nCreating admin user...`);
console.log(`  Email: ${email}`);
createAdmin(email, password);

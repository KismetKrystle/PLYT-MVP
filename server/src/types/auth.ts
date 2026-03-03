export interface JwtUser {
    id: string | number;
    email: string;
    role: 'consumer' | 'farmer' | 'expert' | string;
}


import {z} from 'zod';
// Preserve meaningful password whitespace, while refusing an entirely blank credential.
export const loginPassword=z.string().min(1).max(128).refine(value=>value.trim().length>0,'Password is required');
export const newPassword=loginPassword.refine(value=>value.length>=10,'Password must contain at least 10 characters');
export const profileName=z.string().trim().min(1,'Name is required').max(500);

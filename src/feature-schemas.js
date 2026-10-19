import {z} from 'zod';
const text=n=>z.string().trim().max(n);
export const webUrl=z.union([z.literal(''),z.url().refine(value=>/^https?:\/\//i.test(value),'Use an HTTP or HTTPS URL')]);
const imageUrl=z.union([webUrl,z.string().regex(/^\/assets\/[a-zA-Z0-9_./-]+$/)]);
export const eventJsonFields=new Set(['rules','guidelines','objectives','schedule','faqs','photos','winners','highlights','presentation']);
export const eventExtras={
 presentation:z.object({registration_url:webUrl.optional(),display_order:z.number().int().min(0).optional(),registration_parent_slug:text(120).optional(),previous_slug:text(120).optional(),end_date:z.iso.date().optional(),poster_format:z.enum(['portrait','landscape']).optional(),organiser:text(200).optional(),website:webUrl.optional(),instagram:webUrl.optional(),email:z.union([z.literal(''),z.email()]).optional(),schedule_pending:z.boolean().optional(),registration_pending:z.boolean().optional(),capacity_pending:z.boolean().optional()}).strict().optional(),
 category:z.enum(['Hackathons','Coding competitions','Workshops','Seminars','Other']).optional(),
 tagline:text(200).optional(),tone:z.enum(['lime','lavender','coral','blue']).optional(),
 eligibility:text(3000).optional(),prizes:text(3000).optional(),contact:text(1000).optional(),
 rules:z.array(text(1000)).max(50).optional(),guidelines:z.array(text(1000)).max(50).optional(),
 objectives:z.array(text(1000)).max(50).optional(),highlights:z.array(text(1000)).max(50).optional(),
 schedule:z.array(z.object({time:text(80).min(1),title:text(300).min(1)}).strict()).max(100).optional(),
 faqs:z.array(z.object({q:text(500).min(1),a:text(3000).min(1)}).strict()).max(50).optional(),
 winners:z.array(z.object({place:text(100).min(1),name:text(200).min(1)}).strict()).max(50).optional(),
 photos:z.array(imageUrl).max(50).optional(),participants:z.number().int().min(0).optional(),
};
const publicProfile={bio:text(3000).optional(),year:text(40).optional(),qualification:text(1000).optional(),interests:text(2000).optional(),email:z.union([z.literal(''),z.email()]).optional(),phone:text(30).optional(),cv:webUrl.optional(),source_url:webUrl.optional(),source_retrieved:text(40).optional(),college:text(200).optional(),placeholder:z.boolean().optional(),portfolio:webUrl.optional(),github:webUrl.optional(),linkedin:webUrl.optional()};
export const facultyExtras=publicProfile;
export const teamExtras=publicProfile;
export const participantExtras={roll_number:text(80).optional(),branch:text(100).optional(),bio:text(3000).optional(),github:webUrl.optional(),linkedin:webUrl.optional(),portfolio:webUrl.optional()};
export const participantUpdate=z.object({full_name:text(120).min(2).optional(),phone:text(20).optional(),department:text(80).optional(),academic_year:z.number().int().min(1).max(8).nullable().optional(),college:text(140).optional(),...participantExtras}).strict().refine(v=>Object.keys(v).length>0,'Supply at least one field');
export const settingsSchema=z.object({clubName:text(120).min(2).optional(),college:text(200).optional(),department:text(200).optional(),email:z.union([z.literal(''),z.email()]).optional(),phone:text(30).optional(),address:text(500).optional(),mapUrl:webUrl.optional(),instagram:webUrl.optional(),linkedin:webUrl.optional(),github:webUrl.optional(),portfolio:webUrl.optional(),community:webUrl.optional(),about:text(10000).optional(),vision:text(10000).optional(),mission:text(10000).optional()}).strict().refine(v=>Object.keys(v).length>0,'Supply at least one setting');
export const recordValues=body=>Object.entries(body).map(([key,value])=>eventJsonFields.has(key)?JSON.stringify(value):value);

import { build } from '../app/node_modules/esbuild/lib/main.js';
import { pool, tx } from '../src/db.js';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';

const source = await build({
  entryPoints: [resolve('app/src/data.ts')],
  bundle: true,
  format: 'esm',
  platform: 'node',
  write: false,
});
const moduleUrl = `data:text/javascript;base64,${Buffer.from(source.outputFiles[0].contents).toString('base64')}`;
const { defaults, sampleProfiles } = await import(moduleUrl);
const photos = sampleProfiles.filter(profile => profile.photo).map(profile => profile.photo);
const missingPhotos = photos.filter(photo => photo.startsWith('/assets/') && !existsSync(resolve('app/public', `.${photo}`)));
if (missingPhotos.length) throw new Error(`Frontend image files are missing: ${missingPhotos.join(', ')}`);

const faculty = sampleProfiles.filter(profile => profile.kind === 'faculty');
const students = sampleProfiles.filter(profile => profile.kind === 'student');

try {
  const result = await tx(async client => {
    await client.query("SELECT pg_advisory_xact_lock(hashtext('coding-club-legacy-content-seed'))");
    await client.query(
      `INSERT INTO club.club_settings(singleton,settings) VALUES(true,$1::jsonb)
       ON CONFLICT(singleton) DO UPDATE SET settings=EXCLUDED.settings || club.club_settings.settings,updated_at=now()`,
      [JSON.stringify(defaults)],
    );

    let facultyCount = 0;
    for (const person of faculty) {
      const values = [person.name,person.designation||'',person.department||'',person.role||'',person.photo||'',person.bio||'',person.order,person.order,
        person.year||'',person.qualification||'',person.interests||'',person.email||'',person.phone||'',person.cv||'',person.sourceUrl||'',person.portfolio||'',person.github||'',person.linkedin||'',person.college||'',person.sourceRetrieved||'',!!person.placeholder];
      const updated = await client.query(
        `UPDATE club.faculty SET designation=$2,department=$3,role=$4,photo=$5,bio=$6,hierarchy_level=$7,display_order=$8,is_active=true,
          year=$9,qualification=$10,interests=$11,email=$12,phone=$13,cv=$14,source_url=$15,portfolio=$16,github=$17,linkedin=$18,
          college=$19,source_retrieved=$20,placeholder=$21 WHERE name=$1 RETURNING id`, values,
      );
      if (!updated.rowCount) await client.query(
        `INSERT INTO club.faculty(name,designation,department,role,photo,bio,hierarchy_level,display_order,is_active,year,qualification,interests,email,phone,cv,source_url,portfolio,github,linkedin,college,source_retrieved,placeholder)
         VALUES($1,$2,$3,$4,$5,$6,$7,$8,true,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21)`, values,
      );
      facultyCount++;
    }

    let studentCount = 0;
    for (const person of students) {
      const values = [person.name,person.role||'',person.department||'',person.photo||'',person.github||'',person.linkedin||'',person.order,person.order,
        person.bio||'',person.year||'',person.qualification||'',person.interests||'',person.email||'',person.phone||'',person.cv||'',person.sourceUrl||'',person.portfolio||'',person.college||'',person.sourceRetrieved||'',!!person.placeholder];
      const updated = await client.query(
        `UPDATE club.student_team SET position=$2,department=$3,photo=$4,github=$5,linkedin=$6,hierarchy_level=$7,display_order=$8,is_active=true,
          bio=$9,year=$10,qualification=$11,interests=$12,email=$13,phone=$14,cv=$15,source_url=$16,portfolio=$17,college=$18,source_retrieved=$19,placeholder=$20
         WHERE name=$1 RETURNING id`, values,
      );
      if (!updated.rowCount) await client.query(
        `INSERT INTO club.student_team(name,position,department,photo,github,linkedin,hierarchy_level,display_order,is_active,bio,year,qualification,interests,email,phone,cv,source_url,portfolio,college,source_retrieved,placeholder)
         VALUES($1,$2,$3,$4,$5,$6,$7,$8,true,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20)`, values,
      );
      studentCount++;
    }

    const check = await client.query(`SELECT
      (SELECT count(*)::int FROM club.events) events,
      (SELECT count(*)::int FROM club.faculty WHERE is_active) faculty,
      (SELECT count(*)::int FROM club.student_team WHERE is_active) students,
      (SELECT count(*)::int FROM club.club_settings WHERE settings ? 'clubName' AND settings ? 'mission') settings_ready`);
    return { faculty: facultyCount, students: studentCount, database: check.rows[0] };
  });

  console.log(JSON.stringify(result, null, 2));
} finally {
  await pool.end();
}

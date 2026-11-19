/**
 * spec.js - a written integration specification built from the plan and
 * its review, as Markdown (to download) and HTML (to print).
 */

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

export function buildSpec(plan, rev, t, lang, link) {
  const byId = Object.fromEntries(plan.nodes.map((n) => [n.id, n]));
  const conns = plan.connections.filter((c) => byId[c.from] && byId[c.to]);
  const date = new Date().toLocaleDateString(lang, { year: 'numeric', month: 'long', day: 'numeric' });
  const yes = lang === 'fr' ? 'oui' : lang === 'ar' ? 'نعم' : 'yes';
  const no = lang === 'fr' ? 'non' : lang === 'ar' ? 'لا' : 'no';
  const AR = { title: 'مواصفات الربط', date: 'التاريخ', sys: 'الأنظمة', ifs: 'الروابط', rev: 'المراجعة', n: 'رقم', role: 'الدور', score: 'التقييم', next: 'الخطوات التالية',
    cols: ['من', 'إلى', 'البيانات', 'البروتوكول', 'الطريقة', 'التكرار', 'حفظ ثم إعادة إرسال', 'تنبيه', 'مصادقة'],
    steps: ['مراجعة مسارات البيانات وأحجامها مع فرق العمل وتقنية المعلومات.', 'الحصول على صلاحيات اختبار لكل نظام (بيانات الدخول والعناوين والبيئات).', 'تطوير كل رابط واختباره على بيانات حقيقية، ثم الانتقال إليه.', 'إعداد المراقبة والتنبيهات قبل التشغيل الفعلي.'],
    link: 'الخطة التفاعلية', by: 'أُعدّت باستخدام Integration Toolkit من CICTNA RDC · cictnardc.net' };
  const L = lang === 'ar' ? AR : lang === 'fr'
    ? { title: 'Spécification d’intégration', date: 'Date', sys: 'Systèmes', ifs: 'Interfaces', rev: 'Revue', n: 'N°', role: 'Rôle', score: 'Score', next: 'Prochaines étapes',
        cols: ['De', 'Vers', 'Données', 'Protocole', 'Mode', 'Fréquence', 'Stockage et relance', 'Alerte', 'Auth.'],
        steps: ['Valider les flux et les volumes avec les équipes métier et IT.', 'Obtenir les accès de test à chaque système (identifiants, adresses, environnements).', 'Développer et tester chaque interface sur des données réelles, puis basculer.', 'Mettre en place la supervision et les alertes avant la mise en production.'],
        link: 'Plan interactif', by: 'Préparé avec l’Integration Toolkit de CICTNA RDC · cictnardc.net' }
    : { title: 'Integration specification', date: 'Date', sys: 'Systems', ifs: 'Interfaces', rev: 'Review', n: 'No.', role: 'Role', score: 'Score', next: 'Next steps',
        cols: ['From', 'To', 'Data', 'Protocol', 'Mode', 'Frequency', 'Store and forward', 'Alert', 'Auth'],
        steps: ['Validate flows and volumes with the business and IT teams.', 'Get test access to every system (credentials, addresses, environments).', 'Build and test each interface on real data, then cut over.', 'Set up monitoring and alerts before go-live.'],
        link: 'Interactive plan', by: 'Prepared with the CICTNA RDC Integration Toolkit · cictnardc.net' };

  const sysRows = plan.nodes.map((n, i) => [i + 1, n.name, t('sys_' + n.type), t('sysd_' + n.type)]);
  const ifRows = conns.map((c) => [
    byId[c.from].name, byId[c.to].name, t('d_' + c.data), t('p_' + c.protocol), t('mode_' + c.mode),
    c.mode === 'push' && c.frequency === 'event' ? t('f_event') : t('f_' + c.frequency),
    c.buffered ? yes : no, c.alerts ? yes : no, c.auth ? yes : no,
  ]);
  const findingText = (f) => {
    const p = { ...f.params };
    if (p.data) p.data = t('d_' + p.data);
    if (p.freq) p.freq = t('f_' + p.freq);
    return `${t('f_' + f.key, p)} ${t('f_' + f.key + 'D')}`;
  };

  const mdTable = (head, rows) => [`| ${head.join(' | ')} |`, `|${head.map(() => '---').join('|')}|`, ...rows.map((r) => `| ${r.join(' | ')} |`)].join('\n');
  const md = [
    `# ${L.title}: ${plan.name}`,
    '',
    `${L.date}: ${date}  `,
    `${L.score}: ${rev.score ?? '-'} / 100 (${rev.score != null ? t('grade', rev.score) : '-'})`,
    link ? `${L.link}: ${link}` : '',
    '',
    `## 1. ${L.sys}`,
    '',
    mdTable([L.n, t('name'), t('type'), L.role], sysRows),
    '',
    `## 2. ${L.ifs}`,
    '',
    mdTable(L.cols, ifRows),
    '',
    `## 3. ${L.rev}`,
    '',
    ...rev.findings.map((f) => `- **${t('sev_' + f.severity)}**: ${findingText(f)}`),
    ...rev.good.map((g) => `- **${t('sev_good')}**: ${t(g.key, g.n)}`),
    '',
    `## 4. ${L.next}`,
    '',
    ...L.steps.map((s, i) => `${i + 1}. ${s}`),
    '',
    '---',
    L.by,
    '',
  ].join('\n');

  const htmlTable = (head, rows) => `<table><thead><tr>${head.map((h) => `<th>${esc(h)}</th>`).join('')}</tr></thead><tbody>${rows.map((r) => `<tr>${r.map((v) => `<td>${esc(v)}</td>`).join('')}</tr>`).join('')}</tbody></table>`;
  const html = `<!doctype html><html lang="${lang}" dir="${lang === 'ar' ? 'rtl' : 'ltr'}"><head><meta charset="utf-8"><title>${esc(L.title)}: ${esc(plan.name)}</title>
<style>body{font:14px/1.5 Archivo,system-ui,sans-serif;color:#1f2e2f;max-width:980px;margin:32px auto;padding:0 24px}
h1{font-size:24px;margin:0 0 6px}h2{font-size:17px;margin:28px 0 10px;border-bottom:2px solid #3d6d78;padding-bottom:4px}
table{border-collapse:collapse;width:100%;font-size:12.5px}th,td{border:1px solid #d4dddb;padding:6px 8px;text-align:left;vertical-align:top}
th{background:#eef2f1}.meta{color:#5b6b6a}.sev{font-weight:700}.critical{color:#b4503f}.warning{color:#a85d30}.info{color:#3d6d78}.good{color:#2f5a46}
li{margin:4px 0}footer{margin-top:32px;color:#5b6b6a;font-size:12px}@media print{body{margin:0}}</style></head><body>
<h1>${esc(L.title)}: ${esc(plan.name)}</h1>
<p class="meta">${esc(L.date)}: ${esc(date)} &middot; ${esc(L.score)}: <b>${rev.score ?? '-'}</b> / 100 ${rev.score != null ? `(${esc(t('grade', rev.score))})` : ''}${link ? ` &middot; <a href="${esc(link)}">${esc(L.link)}</a>` : ''}</p>
<h2>1. ${esc(L.sys)}</h2>${htmlTable([L.n, t('name'), t('type'), L.role], sysRows)}
<h2>2. ${esc(L.ifs)}</h2>${htmlTable(L.cols, ifRows)}
<h2>3. ${esc(L.rev)}</h2><ul>
${rev.findings.map((f) => `<li><span class="sev ${f.severity}">${esc(t('sev_' + f.severity))}</span>: ${esc(findingText(f))}</li>`).join('\n')}
${rev.good.map((g) => `<li><span class="sev good">${esc(t('sev_good'))}</span>: ${esc(t(g.key, g.n))}</li>`).join('\n')}
</ul>
<h2>4. ${esc(L.next)}</h2><ol>${L.steps.map((s) => `<li>${esc(s)}</li>`).join('')}</ol>
<footer>${esc(L.by)}</footer></body></html>`;

  return { md, html };
}

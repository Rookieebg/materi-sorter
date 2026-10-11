const FOLDER = 'application/vnd.google-apps.folder';
export const APP_TAG = 'materi-sorter';
export const ROOT_NAME = 'Materi Kuliah';

const esc = (s) => s.replace(/\\/g, '\\\\').replace(/'/g, "\\'");

async function findOrCreateFolder(drive, name, parentId) {
  const q = [
    `mimeType='${FOLDER}'`,
    `name='${esc(name)}'`,
    'trashed=false',
    parentId ? `'${parentId}' in parents` : "'root' in parents",
  ].join(' and ');
  const found = await drive.files.list({ q, fields: 'files(id)', pageSize: 1 });
  if (found.data.files?.length) return found.data.files[0].id;
  const created = await drive.files.create({
    requestBody: { name, mimeType: FOLDER, parents: parentId ? [parentId] : undefined },
    fields: 'id',
  });
  return created.data.id;
}

// ['Materi Kuliah','Semester 1','Kalkulus','Bab 1'] -> id folder paling dalam
export async function ensureFolderPath(drive, parts) {
  let parent = null;
  for (const name of parts) parent = await findOrCreateFolder(drive, name, parent);
  return parent;
}

export async function listFiles(drive, trashed) {
  const files = [];
  let pageToken;
  do {
    const r = await drive.files.list({
      q: `appProperties has { key='app' and value='${APP_TAG}' } and trashed=${trashed ? 'true' : 'false'}`,
      fields: 'nextPageToken, files(id,name,mimeType,size,createdTime,trashed,webViewLink,appProperties)',
      orderBy: 'createdTime desc',
      pageSize: 200,
      pageToken,
    });
    files.push(...(r.data.files || []));
    pageToken = r.data.nextPageToken;
  } while (pageToken);
  return files.map((f) => ({
    id: f.id,
    name: f.name,
    mimeType: f.mimeType,
    size: Number(f.size || 0),
    createdTime: f.createdTime,
    trashed: !!f.trashed,
    link: f.webViewLink,
    semester: f.appProperties?.semester || '',
    matkul: f.appProperties?.matkul || '',
    bab: f.appProperties?.bab || '',
  }));
}

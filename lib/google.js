import { google } from 'googleapis';

// drive.file: web hanya bisa melihat/mengubah file yang dibuatnya sendiri.
export const SCOPES = [
  'https://www.googleapis.com/auth/drive.file',
  'https://www.googleapis.com/auth/userinfo.email',
  'https://www.googleapis.com/auth/userinfo.profile',
];

export function oauthClient() {
  return new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    `${process.env.APP_URL}/api/auth/callback`
  );
}

export function driveFor(session) {
  const auth = oauthClient();
  auth.setCredentials({ refresh_token: session.refresh_token });
  return google.drive({ version: 'v3', auth });
}

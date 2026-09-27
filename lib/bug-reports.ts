import {getD1} from './s27-server';

export async function ensureBugReportsTable(){
  const db=getD1();
  await db.batch([db.prepare(`CREATE TABLE IF NOT EXISTS bug_reports (
    id TEXT PRIMARY KEY NOT NULL,
    user_id TEXT,
    visitor_id TEXT NOT NULL,
    section TEXT NOT NULL,
    description TEXT NOT NULL,
    user_agent TEXT NOT NULL,
    page_url TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'open',
    created_at INTEGER NOT NULL,
    resolved_at INTEGER
  )`),db.prepare('CREATE INDEX IF NOT EXISTS idx_bug_reports_status_created ON bug_reports(status,created_at)'),db.prepare('CREATE INDEX IF NOT EXISTS idx_bug_reports_visitor_created ON bug_reports(visitor_id,created_at)')]);
}

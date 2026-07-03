-- Expand lease document storage support for common property document formats.
-- This updates existing buckets too; the original bucket creation used
-- on conflict do nothing, so live projects need an explicit update.
update storage.buckets
set allowed_mime_types = array[
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'image/png',
  'image/jpeg',
  'image/jpg',
  'text/csv',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
]
where id = 'lease-documents';

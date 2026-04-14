import { supabase } from '../../lib/supabase'
import formidable from 'formidable'
import fs from 'fs'
import path from 'path'

export const config = { api: { bodyParser: false } }

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
const MAX_SIZE_MB = 5

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST'])
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const form = formidable({
    maxFileSize: MAX_SIZE_MB * 1024 * 1024,
    keepExtensions: true,
  })

  let fields, files
  try {
    ;[fields, files] = await form.parse(req)
  } catch (err) {
    return res.status(400).json({ error: `File too large or invalid. Max size: ${MAX_SIZE_MB}MB` })
  }

  const file = Array.isArray(files.photo) ? files.photo[0] : files.photo
  if (!file) return res.status(400).json({ error: 'No file uploaded' })

  if (!ALLOWED_TYPES.includes(file.mimetype)) {
    return res.status(400).json({ error: 'Only JPEG, PNG, WebP, and GIF images are allowed' })
  }

  const ext = path.extname(file.originalFilename || '.jpg')
  const fileName = `${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`

  const fileBuffer = fs.readFileSync(file.filepath)

  const { data, error } = await supabase.storage
    .from('post-photos')
    .upload(fileName, fileBuffer, {
      contentType: file.mimetype,
      upsert: false,
    })

  fs.unlinkSync(file.filepath)

  if (error) return res.status(500).json({ error: error.message })

  const { data: urlData } = supabase.storage
    .from('post-photos')
    .getPublicUrl(fileName)

  return res.status(200).json({ url: urlData.publicUrl })
}

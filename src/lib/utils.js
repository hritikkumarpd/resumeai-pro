import { clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs) {
  return twMerge(clsx(inputs))
}

export function formatDate(date) {
  return new Date(date).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
}

export function slugify(str) {
  return str.toLowerCase().replace(/\s+/g, '-').replace(/[^\w-]/g, '')
}

export function countKeywords(text, keywords) {
  const lower = text.toLowerCase()
  return keywords.filter(kw => lower.includes(kw.toLowerCase()))
}

export function calcAtsScore(resumeText, jobText) {
  const jobWords = jobText
    .toLowerCase()
    .replace(/[^\w\s]/g, '')
    .split(/\s+/)
    .filter(w => w.length > 3)
  const uniqueJobWords = [...new Set(jobWords)]
  const resumeLower = resumeText.toLowerCase()
  const matched = uniqueJobWords.filter(w => resumeLower.includes(w))
  const score = Math.round((matched.length / Math.max(uniqueJobWords.length, 1)) * 100)
  return {
    score: Math.min(score, 100),
    matched,
    missing: uniqueJobWords.filter(w => !resumeLower.includes(w)).slice(0, 20),
    total: uniqueJobWords.length,
  }
}

export function generateId() {
  return Math.random().toString(36).substr(2, 9)
}

export const RESUME_STORAGE_KEY = 'resumeai_pro_resumes'
export const ACTIVE_RESUME_KEY  = 'resumeai_pro_active'

export function saveResumes(resumes) {
  localStorage.setItem(RESUME_STORAGE_KEY, JSON.stringify(resumes))
}

export function loadResumes() {
  try {
    return JSON.parse(localStorage.getItem(RESUME_STORAGE_KEY)) || []
  } catch { return [] }
}

import { useState, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { settingsApi, tagsApi, categoriesApi, backupApi } from '../utils/api'
import Modal from '../components/Modal'
import ModelSelector from '../components/ModelSelector'
import {
  Database, Palette, Info, Save, ExternalLink, Tag, FolderOpen,
  Cloud, Upload, Download, RefreshCw, Trash2, Plus, Check, X,
  AlertCircle, Clock, Image, Cpu, Pipette, RotateCcw, ShieldAlert, Sparkles, Key, Eye, EyeOff,
  PackageOpen, PackageCheck
} from 'lucide-react'
import toast from 'react-hot-toast'
import { formatDistanceToNow } from 'date-fns'

// ── Provider brand SVG icons (real brand paths from Simple Icons) ─
const IconOpenRouter = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="#7C3AED" xmlns="http://www.w3.org/2000/svg">
    <path d="M16.778 1.844v1.919q-.569-.026-1.138-.032-.708-.008-1.415.037c-1.93.126-4.023.728-6.149 2.237-2.911 2.066-2.731 1.95-4.14 2.75-.396.223-1.342.574-2.185.798-.841.225-1.753.333-1.751.333v4.229s.768.108 1.61.333c.842.224 1.789.575 2.185.799 1.41.798 1.228.683 4.14 2.75 2.126 1.509 4.22 2.11 6.148 2.236.88.058 1.716.041 2.555.005v1.918l7.222-4.168-7.222-4.17v2.176c-.86.038-1.611.065-2.278.021-1.364-.09-2.417-.357-3.979-1.465-2.244-1.593-2.866-2.027-3.68-2.508.889-.518 1.449-.906 3.822-2.59 1.56-1.109 2.614-1.377 3.978-1.466.667-.044 1.418-.017 2.278.02v2.176L24 6.014Z"/>
  </svg>
)
const IconOpenAI = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
    <path d="M22.2819 9.8211a5.9847 5.9847 0 0 0-.5157-4.9108 6.0462 6.0462 0 0 0-6.5098-2.9A6.0651 6.0651 0 0 0 4.9807 4.1818a5.9847 5.9847 0 0 0-3.9977 2.9 6.0462 6.0462 0 0 0 .7427 7.0966 5.98 5.98 0 0 0 .511 4.9107 6.051 6.051 0 0 0 6.5146 2.9001A5.9847 5.9847 0 0 0 13.2599 24a6.0557 6.0557 0 0 0 5.7718-4.2058 5.9894 5.9894 0 0 0 3.9977-2.9001 6.0557 6.0557 0 0 0-.7475-7.0729zm-9.022 12.6081a4.4755 4.4755 0 0 1-2.8764-1.0408l.1419-.0804 4.7783-2.7582a.7948.7948 0 0 0 .3927-.6813v-6.7369l2.02 1.1686a.071.071 0 0 1 .038.052v5.5826a4.504 4.504 0 0 1-4.4945 4.4944zm-9.6607-4.1254a4.4708 4.4708 0 0 1-.5346-3.0137l.142.0852 4.783 2.7582a.7712.7712 0 0 0 .7806 0l5.8428-3.3685v2.3324a.0804.0804 0 0 1-.0332.0615L9.74 19.9502a4.4992 4.4992 0 0 1-6.1408-1.6464zM2.3408 7.8956a4.485 4.485 0 0 1 2.3655-1.9728V11.6a.7664.7664 0 0 0 .3879.6765l5.8144 3.3543-2.0201 1.1685a.0757.0757 0 0 1-.071 0l-4.8303-2.7865A4.504 4.504 0 0 1 2.3408 7.872zm16.5963 3.8558L13.1038 8.364 15.1192 7.2a.0757.0757 0 0 1 .071 0l4.8303 2.7913a4.4944 4.4944 0 0 1-.6765 8.1042v-5.6772a.79.79 0 0 0-.407-.667zm2.0107-3.0231l-.142-.0852-4.7735-2.7818a.7759.7759 0 0 0-.7854 0L9.409 9.2297V6.8974a.0662.0662 0 0 1 .0284-.0615l4.8303-2.7866a4.4992 4.4992 0 0 1 6.6802 4.66zM8.3065 12.863l-2.02-1.1638a.0804.0804 0 0 1-.038-.0567V6.0742a4.4992 4.4992 0 0 1 7.3757-3.4537l-.142.0805L8.704 5.459a.7948.7948 0 0 0-.3927.6813zm1.0976-2.3654l2.602-1.4998 2.6069 1.4998v2.9994l-2.5974 1.4997-2.6067-1.4997Z"/>
  </svg>
)
const IconAnthropic = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="#D97706" xmlns="http://www.w3.org/2000/svg">
    <path d="M17.3041 3.541h-3.6718l6.696 16.918H24Zm-10.6082 0L0 20.459h3.7442l1.3693-3.5527h7.0052l1.3693 3.5528h3.7442L10.5363 3.5409Zm-.3712 10.2232 2.2914-5.9456 2.2914 5.9456Z"/>
  </svg>
)
const IconGemini = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="gem-grad-si" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#4285F4"/>
        <stop offset="100%" stopColor="#8B5CF6"/>
      </linearGradient>
    </defs>
    <path fill="url(#gem-grad-si)" d="M11.04 19.32Q12 21.51 12 24q0-2.49.93-4.68.96-2.19 2.58-3.81t3.81-2.55Q21.51 12 24 12q-2.49 0-4.68-.93a12.3 12.3 0 0 1-3.81-2.58 12.3 12.3 0 0 1-2.58-3.81Q12 2.49 12 0q0 2.49-.96 4.68-.93 2.19-2.55 3.81a12.3 12.3 0 0 1-3.81 2.58Q2.49 12 0 12q2.49 0 4.68.96 2.19.93 3.81 2.55t2.55 3.81"/>
  </svg>
)
const IconBedrock = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="#FF9900" xmlns="http://www.w3.org/2000/svg">
    <path d="M6.763 10.036c0 .296.032.535.088.71.064.176.144.368.256.576.04.063.056.127.056.183 0 .08-.048.16-.152.24l-.503.335a.383.383 0 0 1-.208.072c-.08 0-.16-.04-.239-.112a2.47 2.47 0 0 1-.287-.375 6.18 6.18 0 0 1-.248-.471c-.622.734-1.405 1.101-2.347 1.101-.67 0-1.205-.191-1.596-.574-.391-.384-.59-.894-.59-1.533 0-.678.239-1.23.726-1.644.487-.415 1.133-.623 1.955-.623.272 0 .551.024.846.064.296.04.6.104.918.176v-.583c0-.607-.127-1.03-.375-1.277-.255-.248-.686-.367-1.3-.367-.28 0-.568.031-.863.103-.295.072-.583.16-.862.272a2.287 2.287 0 0 1-.28.104.488.488 0 0 1-.127.023c-.112 0-.168-.08-.168-.247v-.391c0-.128.016-.224.056-.28a.597.597 0 0 1 .224-.167c.279-.144.614-.264 1.005-.36a4.84 4.84 0 0 1 1.246-.151c.95 0 1.644.216 2.091.647.439.43.662 1.085.662 1.963v2.586zm-3.24 1.214c.263 0 .534-.048.822-.144.287-.096.543-.271.758-.51.128-.152.224-.32.272-.512.047-.191.08-.423.08-.694v-.335a6.66 6.66 0 0 0-.735-.136 6.02 6.02 0 0 0-.75-.048c-.535 0-.926.104-1.19.32-.263.215-.39.518-.39.917 0 .375.095.655.295.846.191.2.47.296.838.296zm6.41.862c-.144 0-.24-.024-.304-.08-.064-.048-.12-.16-.168-.311L7.586 5.55a1.398 1.398 0 0 1-.072-.32c0-.128.064-.2.191-.2h.783c.151 0 .255.025.31.08.065.048.113.16.16.312l1.342 5.284 1.245-5.284c.04-.16.088-.264.151-.312a.549.549 0 0 1 .32-.08h.638c.152 0 .256.025.32.08.063.048.12.16.151.312l1.261 5.348 1.381-5.348c.048-.16.104-.264.16-.312a.52.52 0 0 1 .311-.08h.743c.127 0 .2.065.2.2 0 .04-.009.08-.017.128a1.137 1.137 0 0 1-.056.2l-1.923 6.17c-.048.16-.104.263-.168.311a.51.51 0 0 1-.303.08h-.687c-.151 0-.255-.024-.32-.08-.063-.056-.119-.16-.15-.32l-1.238-5.148-1.23 5.14c-.04.16-.087.264-.15.32-.065.056-.177.08-.32.08zm10.256.215c-.415 0-.83-.048-1.229-.143-.399-.096-.71-.2-.918-.32-.128-.071-.215-.151-.247-.223a.563.563 0 0 1-.048-.224v-.407c0-.167.064-.247.183-.247.048 0 .096.008.144.024.048.016.12.048.2.08.271.12.566.215.878.279.319.064.63.096.95.096.502 0 .894-.088 1.165-.264a.86.86 0 0 0 .415-.758.777.777 0 0 0-.215-.559c-.144-.151-.416-.287-.807-.415l-1.157-.36c-.583-.183-1.014-.454-1.277-.813a1.902 1.902 0 0 1-.4-1.158c0-.335.073-.63.216-.886.144-.255.335-.479.575-.654.24-.184.51-.32.83-.415.32-.096.655-.136 1.006-.136.175 0 .359.008.535.032.183.024.35.056.518.088.16.04.312.08.455.127.144.048.256.096.336.144a.69.69 0 0 1 .24.2.43.43 0 0 1 .071.263v.375c0 .168-.064.256-.184.256a.83.83 0 0 1-.303-.096 3.652 3.652 0 0 0-1.532-.311c-.455 0-.815.071-1.062.223-.248.152-.375.383-.375.71 0 .224.08.416.24.567.159.152.454.304.877.44l1.134.358c.574.184.99.44 1.237.767.247.327.367.702.367 1.117 0 .343-.072.655-.207.926-.144.272-.336.511-.583.703-.248.2-.543.343-.886.447-.36.111-.734.167-1.142.167zM21.698 16.207c-2.626 1.94-6.442 2.969-9.722 2.969-4.598 0-8.74-1.7-11.87-4.526-.247-.223-.024-.527.272-.351 3.384 1.963 7.559 3.153 11.877 3.153 2.914 0 6.114-.607 9.06-1.852.439-.2.814.287.383.607zM22.792 14.961c-.336-.43-2.22-.207-3.074-.103-.255.032-.295-.192-.063-.36 1.5-1.053 3.967-.75 4.254-.399.287.36-.08 2.826-1.485 4.007-.215.184-.423.088-.327-.151.32-.79 1.03-2.57.695-2.994z"/>
  </svg>
)

// ── AI Providers ─────────────────────────────────────────────
const AI_PROVIDERS = [
  {
    id: 'openrouter', label: 'OpenRouter', icon: <IconOpenRouter/>, color: '#7C3AED', hint: 'Multi-provider gateway',
    baseUrl: 'https://openrouter.ai/api/v1', defaultModel: 'anthropic/claude-opus-4-6',
    keyPlaceholder: 'sk-or-v1-…', docsUrl: 'https://openrouter.ai/keys',
  },
  {
    id: 'openai', label: 'OpenAI', icon: <IconOpenAI/>, color: '#10a37f', hint: 'GPT-5.4, o3 & more',
    baseUrl: 'https://api.openai.com/v1', defaultModel: 'gpt-5.4',
    keyPlaceholder: 'sk-…', docsUrl: 'https://platform.openai.com/api-keys',
  },
  {
    id: 'anthropic', label: 'Anthropic', icon: <IconAnthropic/>, color: '#D97706', hint: 'Claude 4.6 · 1M ctx',
    baseUrl: null, defaultModel: 'claude-opus-4-6',
    keyPlaceholder: 'sk-ant-…', docsUrl: 'https://console.anthropic.com/settings/keys',
  },
  {
    id: 'gemini', label: 'Google Gemini', icon: <IconGemini/>, color: '#4285F4', hint: 'Gemini 3.1 Pro',
    baseUrl: null, defaultModel: 'gemini-3.1-pro-preview',
    keyPlaceholder: 'AIzaSy…', docsUrl: 'https://aistudio.google.com/app/apikey',
  },
  {
    id: 'bedrock', label: 'Amazon Bedrock', icon: <IconBedrock/>, color: '#FF9900', hint: 'AWS IAM keys',
    baseUrl: null, defaultModel: 'anthropic.claude-opus-4-6-v1:0',
    keyPlaceholder: null,
  },
]

// ── Per-provider latest models — March 2026 ───────────────────
const PROVIDER_MODELS = {
  openrouter: [
    { group: 'Anthropic (latest)',  models: ['anthropic/claude-opus-4-6','anthropic/claude-sonnet-4-6','anthropic/claude-opus-4-5','anthropic/claude-sonnet-4-5','anthropic/claude-haiku-4-5','anthropic/claude-3-7-sonnet'] },
    { group: 'OpenAI (latest)',     models: ['openai/gpt-5.4','openai/gpt-5.4-mini','openai/gpt-4.1','openai/gpt-4.1-mini','openai/gpt-4o','openai/o3','openai/o3-mini','openai/o1'] },
    { group: 'Google (latest)',     models: ['google/gemini-3.1-pro-preview','google/gemini-3-flash-preview','google/gemini-3.1-flash-lite-preview','google/gemini-2.5-pro','google/gemini-2.5-flash','google/gemini-2.0-flash'] },
    { group: 'Meta / Llama',        models: ['meta-llama/llama-4-maverick','meta-llama/llama-4-scout','meta-llama/llama-3.3-70b-instruct','meta-llama/llama-3.1-405b-instruct'] },
    { group: 'Mistral',             models: ['mistralai/mistral-medium-3','mistralai/mistral-small-3.1-24b','mistralai/codestral-2501','mistralai/pixtral-large-2411'] },
    { group: 'xAI',                 models: ['x-ai/grok-3-beta','x-ai/grok-3-mini-beta','x-ai/grok-2-1212'] },
    { group: 'DeepSeek',            models: ['deepseek/deepseek-chat-v3-0324','deepseek/deepseek-r1','deepseek/deepseek-v3'] },
  ],
  openai: [
    { group: 'GPT-5 (latest)',        models: ['gpt-5.4','gpt-5.4-mini'] },
    { group: 'GPT-4.1',               models: ['gpt-4.1','gpt-4.1-mini','gpt-4.1-nano'] },
    { group: 'GPT-4o',                models: ['gpt-4o','gpt-4o-mini'] },
    { group: 'Reasoning (o-series)',   models: ['o3','o3-mini','o1','o1-mini','o1-pro'] },
  ],
  anthropic: [
    { group: 'Claude 4.6 (latest)',   models: ['claude-opus-4-6','claude-sonnet-4-6'] },
    { group: 'Claude 4.5',            models: ['claude-opus-4-5','claude-sonnet-4-5','claude-haiku-4-5'] },
    { group: 'Claude 3.7',            models: ['claude-3-7-sonnet-20250219','claude-3-7-sonnet-20250219:thinking'] },
    { group: 'Claude 3.5',            models: ['claude-3-5-sonnet-20241022','claude-3-5-haiku-20241022'] },
    { group: 'Claude 3',              models: ['claude-3-opus-20240229','claude-3-haiku-20240307'] },
  ],
  gemini: [
    { group: 'Gemini 3 (latest)',     models: ['gemini-3.1-pro-preview','gemini-3-flash-preview','gemini-3.1-flash-lite-preview'] },
    { group: 'Gemini 2.5',            models: ['gemini-2.5-pro','gemini-2.5-flash','gemini-2.5-flash-lite'] },
    { group: 'Gemini 2.0 (deprecated)', models: ['gemini-2.0-flash','gemini-2.0-flash-lite'] },
    { group: 'Gemini 1.5 (deprecated)', models: ['gemini-1.5-pro','gemini-1.5-flash','gemini-1.5-flash-8b'] },
  ],
  bedrock: [
    { group: 'Anthropic Claude (latest)', models: ['anthropic.claude-opus-4-6-v1:0','anthropic.claude-sonnet-4-6-v1:0','anthropic.claude-3-7-sonnet-20250219-v1:0','anthropic.claude-3-5-sonnet-20241022-v2:0','anthropic.claude-3-5-haiku-20241022-v1:0'] },
    { group: 'Amazon Nova 2',             models: ['amazon.nova-2-lite-v1:0','amazon.nova-2-pro-v1:0'] },
    { group: 'Amazon Nova 1',             models: ['amazon.nova-pro-v1:0','amazon.nova-lite-v1:0','amazon.nova-micro-v1:0'] },
    { group: 'Meta Llama',                models: ['meta.llama3-70b-instruct-v1:0','meta.llama3-8b-instruct-v1:0','meta.llama3-2-90b-instruct-v1:0'] },
    { group: 'Mistral',                   models: ['mistral.mistral-large-2402-v1:0','mistral.mixtral-8x7b-instruct-v0:1'] },
  ],
}

// ── Latest AI Models — March 2026 (via OpenRouter) ─────────────
const AI_MODELS = [
  // OpenAI — latest March 2026
  { group: 'OpenAI', models: [
    'gpt-5.4', 'gpt-5.4-mini',
    'gpt-4.1', 'gpt-4.1-mini', 'gpt-4.1-nano',
    'gpt-4o', 'gpt-4o-mini',
    'o3', 'o3-mini', 'o1', 'o1-mini',
  ]},
  // Anthropic — latest March 2026
  { group: 'Anthropic', models: [
    'claude-opus-4-6',
    'claude-sonnet-4-6',
    'claude-opus-4-5',
    'claude-sonnet-4-5',
    'claude-haiku-4-5',
    'claude-3-7-sonnet-20250219',
    'claude-3-7-sonnet-20250219:thinking',
    'claude-3-5-sonnet-20241022',
    'claude-3-5-haiku-20241022',
  ]},
  // Google — latest March 2026
  { group: 'Google', models: [
    'gemini-3.1-pro-preview',
    'gemini-3-flash-preview',
    'gemini-3.1-flash-lite-preview',
    'gemini-2.5-pro',
    'gemini-2.5-flash',
    'gemini-2.5-flash-lite',
    'gemini-2.0-flash',
    'gemini-1.5-pro',
  ]},
  // Meta — latest March 2026
  { group: 'Meta / Llama', models: [
    'llama-4-maverick',
    'llama-4-scout',
    'llama-3.3-70b-instruct',
    'llama-3.2-90b-vision-instruct',
    'llama-3.1-405b-instruct',
  ]},
  // Mistral — latest March 2026
  { group: 'Mistral', models: [
    'mistral-small-3.1-24b',
    'mistral-large-2411',
    'mistral-medium-3',
    'codestral-2501',
    'pixtral-large-2411',
  ]},
  // xAI — latest March 2026
  { group: 'xAI / Grok', models: [
    'grok-3-beta',
    'grok-3-mini-beta',
    'grok-2-1212',
    'grok-2-vision-1212',
  ]},
  // DeepSeek — latest March 2026
  { group: 'DeepSeek', models: [
    'deepseek-chat-v3-0324',
    'deepseek-r1',
    'deepseek-r1-distill-llama-70b',
    'deepseek-v3',
  ]},
  // Qwen / Alibaba — latest March 2026
  { group: 'Qwen / Alibaba', models: [
    'qwen-max-2025-01-21',
    'qwen2.5-72b-instruct',
    'qwen2.5-vl-72b-instruct',
    'qwq-32b',
    'qwen3.5-9b',
  ]},
  // NVIDIA — latest March 2026
  { group: 'NVIDIA', models: [
    'nvidia/nemotron-3-super',
    'nvidia/llama-3.1-nemotron-ultra-253b',
    'nvidia/llama-3.3-nemotron-super-49b',
  ]},
  // Cohere — latest March 2026
  { group: 'Cohere', models: [
    'command-a-03-2025',
    'command-r-plus-08-2024',
    'command-r-08-2024',
  ]},
  // ByteDance — latest March 2026
  { group: 'ByteDance', models: [
    'bytedance-seed/seed-2.0-lite',
    'doubao-1-5-pro-32k',
  ]},
  // MiniMax — latest March 2026
  { group: 'MiniMax', models: [
    'minimax/minimax-m2.7',
    'minimax-01',
  ]},
  // Amazon
  { group: 'Amazon', models: [
    'amazon/nova-pro-v1',
    'amazon/nova-lite-v1',
    'amazon/nova-micro-v1',
  ]},
]

const ACCENT_COLORS = [
  { name: 'Blue', value: '#007AFF' },
  { name: 'Purple', value: '#BF5AF2' },
  { name: 'Pink', value: '#FF375F' },
  { name: 'Orange', value: '#FF9F0A' },
  { name: 'Green', value: '#30D158' },
  { name: 'Teal', value: '#5AC8FA' },
  { name: 'Indigo', value: '#5E5CE6' },
  { name: 'Yellow', value: '#FFD60A' },
]

const TAG_COLORS = ['#007AFF', '#BF5AF2', '#FF375F', '#FF9F0A', '#30D158', '#5AC8FA', '#5E5CE6', '#FFD60A', '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4']

const S3_REGIONS = ['us-east-1', 'us-east-2', 'us-west-1', 'us-west-2', 'eu-west-1', 'eu-west-2', 'eu-central-1', 'ap-southeast-1', 'ap-southeast-2', 'ap-northeast-1', 'sa-east-1']

// ── Reusable Color Swatches Picker ──────────────────────────────
function ColorSwatches({ value, onChange, colors, size = 'md' }) {
  const pickerRef = useRef(null)
  const isPreset = colors.includes(value)
  const swatchSize = size === 'lg' ? 34 : 22
  const borderWidth = size === 'lg' ? 3 : 2

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: size === 'lg' ? 10 : 6, flexWrap: 'wrap' }}>
      {/* Preset swatches */}
      {colors.map(c => {
        const selected = value === c
        return (
          <button
            key={c}
            onClick={() => onChange(c)}
            title={c}
            style={{
              width: swatchSize, height: swatchSize,
              borderRadius: '50%',
              background: c,
              cursor: 'pointer',
              border: selected ? `${borderWidth}px solid white` : `${borderWidth}px solid transparent`,
              boxShadow: selected
                ? `0 0 0 2px ${c}, 0 4px 12px ${c}80`
                : `0 2px 6px ${c}50`,
              transform: selected ? 'scale(1.18)' : 'scale(1)',
              transition: 'all 0.18s cubic-bezier(0.34, 1.56, 0.64, 1)',
              flexShrink: 0,
            }}
          />
        )
      })}

      {/* Divider */}
      <div style={{ width: 1, height: swatchSize * 0.7, background: 'rgba(255,255,255,0.1)', flexShrink: 0 }} />

      {/* Custom color picker button */}
      <label
        title="Custom color"
        style={{
          position: 'relative',
          width: swatchSize, height: swatchSize,
          borderRadius: '50%',
          background: !isPreset && value ? value : 'rgba(255,255,255,0.07)',
          border: !isPreset && value
            ? `${borderWidth}px solid white`
            : `${borderWidth}px dashed rgba(255,255,255,0.25)`,
          boxShadow: !isPreset && value ? `0 0 0 2px ${value}, 0 4px 12px ${value}80` : 'none',
          cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexShrink: 0,
          overflow: 'hidden',
          transition: 'all 0.18s',
          transform: !isPreset && value ? 'scale(1.18)' : 'scale(1)',
        }}
      >
        {(isPreset || !value) && (
          <Pipette size={size === 'lg' ? 14 : 10} color="rgba(255,255,255,0.45)" />
        )}
        <input
          ref={pickerRef}
          type="color"
          value={value || '#007AFF'}
          onChange={e => onChange(e.target.value)}
          style={{ position: 'absolute', inset: 0, opacity: 0, cursor: 'pointer', width: '100%', height: '100%' }}
        />
      </label>

      {/* Hex value display (only for lg size / accent color) */}
      {size === 'lg' && (
        <div style={{
          fontSize: 12, fontFamily: 'var(--font-mono)',
          color: 'rgba(255,255,255,0.5)',
          background: 'rgba(255,255,255,0.06)',
          border: '1px solid rgba(255,255,255,0.1)',
          borderRadius: 8, padding: '4px 10px',
          letterSpacing: 1,
        }}>
          {(value || '#007AFF').toUpperCase()}
        </div>
      )}
    </div>
  )
}

function Section({ icon: Icon, title, color, children }) {
  return (
    <section style={{ marginBottom: 28 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
        <Icon size={16} color={color || 'var(--text-secondary)'} />
        <h2 style={{ fontSize: 14, fontWeight: 600, letterSpacing: 0.1 }}>{title}</h2>
      </div>
      {children}
    </section>
  )
}

export default function SettingsPage() {
  const qc = useQueryClient()
  const fileInputRef = useRef(null)
  const logoInputRef = useRef(null)

  const { data: settings, isLoading } = useQuery({ queryKey: ['settings'], queryFn: () => settingsApi.get() })
  const { data: stats } = useQuery({ queryKey: ['stats'], queryFn: () => settingsApi.stats() })
  const { data: tagsData } = useQuery({ queryKey: ['tags'], queryFn: () => tagsApi.list() })
  const { data: categoriesData } = useQuery({ queryKey: ['categories'], queryFn: () => categoriesApi.list() })
  const { data: s3Status } = useQuery({ queryKey: ['s3-status'], queryFn: () => backupApi.s3Status(), retry: false, staleTime: 60000 })
  const { data: s3Files, refetch: refetchS3 } = useQuery({ queryKey: ['s3-files'], queryFn: () => backupApi.s3List(), enabled: false, retry: false })

  const [localSettings, setLocalSettings] = useState({})
  const [showAiKey, setShowAiKey] = useState(false)
  const [newTag, setNewTag] = useState({ name: '', color: '#007AFF' })
  const [newCat, setNewCat] = useState({ name: '', color: '#007AFF' })
  const [s3Config, setS3Config] = useState({})
  const [testingS3, setTestingS3] = useState(false)
  const [s3TestResult, setS3TestResult] = useState(null)
  const [showS3Files, setShowS3Files] = useState(false)
  const [importMerge, setImportMerge] = useState(false)
  const [resetConfirm, setResetConfirm] = useState(false)

  const currentSettings = { ...settings, ...localSettings }

  const updateMutation = useMutation({
    mutationFn: (data) => settingsApi.update(data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['settings'] }); toast.success('Settings saved!') },
    onError: (e) => toast.error(e.message),
  })

  const DEFAULTS = {
    accent_color: '#007AFF',
    default_model: 'claude-sonnet-4-6',
    app_logo: '',
    s3_bucket: '', s3_region: 'us-east-1', s3_prefix: 'promptly-backups/',
    s3_access_key: '', s3_secret_key: '', s3_endpoint: '',
    auto_sync_s3: 'false',
  }

  const handleReset = async () => {
    await updateMutation.mutateAsync(DEFAULTS)
    setLocalSettings({})
    setS3Config({})
    setResetConfirm(false)
    toast.success('Settings reset to defaults')
  }

  const createTagMutation = useMutation({
    mutationFn: (data) => tagsApi.create(data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['tags'] }); setNewTag({ name: '', color: '#007AFF' }); toast.success('Tag created!') },
    onError: (e) => toast.error(e.message),
  })

  const deleteTagMutation = useMutation({
    mutationFn: (id) => tagsApi.delete(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['tags'] }); toast.success('Tag deleted') },
    onError: (e) => toast.error(e.message),
  })

  const createCatMutation = useMutation({
    mutationFn: (data) => categoriesApi.create(data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['categories'] }); setNewCat({ name: '', color: '#007AFF' }); toast.success('Category created!') },
    onError: (e) => toast.error(e.message),
  })

  const deleteCatMutation = useMutation({
    mutationFn: (id) => categoriesApi.delete(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['categories'] }); toast.success('Category deleted') },
    onError: (e) => toast.error(e.message),
  })

  const s3UploadMutation = useMutation({
    mutationFn: () => backupApi.s3Upload(),
    onSuccess: (r) => { qc.invalidateQueries({ queryKey: ['s3-status'] }); toast.success(`Backed up to S3: ${r.key}`) },
    onError: (e) => toast.error(e.message),
  })

  const s3RestoreMutation = useMutation({
    mutationFn: ({ key, merge }) => backupApi.s3Restore(key, merge),
    onSuccess: (r) => { qc.invalidateQueries(); toast.success(`Restored ${Object.values(r.imported).reduce((a, b) => a + b, 0)} items from S3`) },
    onError: (e) => toast.error(e.message),
  })

  const set = (key, value) => {
    setLocalSettings(s => ({ ...s, [key]: value }))
    if (key === 'accent_color') {
      document.documentElement.style.setProperty('--blue', value)
      document.documentElement.style.setProperty('--accent', value)
    }
  }

  const hasChanges = Object.keys(localSettings).length > 0

  const handleSave = () => {
    updateMutation.mutate(localSettings)
    setLocalSettings({})
  }

  const handleLogoUpload = (e) => {
    const file = e.target.files[0]
    if (!file) return
    if (file.size > 500 * 1024) { toast.error('Logo must be under 500KB'); return }
    const reader = new FileReader()
    reader.onload = (ev) => {
      set('app_logo', ev.target.result)
      toast.success('Logo uploaded — save to apply')
    }
    reader.readAsDataURL(file)
  }

  const handleImportFile = (e) => {
    const file = e.target.files[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = async (ev) => {
      try {
        const data = JSON.parse(ev.target.result)
        const result = await backupApi.importJson(data, importMerge)
        qc.invalidateQueries()
        toast.success(`Imported: ${Object.entries(result.imported).map(([k, v]) => `${v} ${k}`).join(', ')}`)
      } catch (err) {
        toast.error('Import failed: ' + err.message)
      }
    }
    reader.readAsText(file)
    e.target.value = ''
  }

  const handleTestS3 = async () => {
    setTestingS3(true)
    setS3TestResult(null)
    try {
      const cfg = {
        bucket: s3Config.bucket || currentSettings.s3_bucket,
        region: s3Config.region || currentSettings.s3_region,
        access_key: s3Config.access_key || currentSettings.s3_access_key,
        secret_key: s3Config.secret_key || currentSettings.s3_secret_key,
        endpoint: s3Config.endpoint ?? currentSettings.s3_endpoint ?? '',
      }
      await backupApi.s3Test(cfg)
      setS3TestResult({ ok: true, msg: 'Connection successful ✓' })
    } catch (err) {
      setS3TestResult({ ok: false, msg: err.message })
    } finally {
      setTestingS3(false)
    }
  }

  const handleSaveS3 = () => {
    const rawPrefix = s3Config.prefix ?? currentSettings.s3_prefix ?? 'promptly-backups/'
    const normalizedPrefix = rawPrefix && !rawPrefix.endsWith('/') ? `${rawPrefix}/` : rawPrefix
    const updates = {
      s3_bucket: s3Config.bucket ?? currentSettings.s3_bucket ?? '',
      s3_region: s3Config.region ?? currentSettings.s3_region ?? 'us-east-1',
      s3_access_key: s3Config.access_key ?? currentSettings.s3_access_key ?? '',
      s3_secret_key: s3Config.secret_key ?? currentSettings.s3_secret_key ?? '',
      s3_prefix: normalizedPrefix,
      s3_endpoint: s3Config.endpoint ?? currentSettings.s3_endpoint ?? '',
      sync_enabled: currentSettings.sync_enabled ?? 'false',
      sync_interval: currentSettings.sync_interval ?? '60',
    }
    updateMutation.mutate(updates)
    setS3Config({})
    setLocalSettings(ls => { const n = { ...ls }; delete n.sync_enabled; delete n.sync_interval; return n })
    qc.invalidateQueries({ queryKey: ['s3-status'] })
  }

  if (isLoading) return <div className="page-content" style={{ display: 'flex', justifyContent: 'center', padding: 80 }}><div className="spinner" /></div>

  const tags = tagsData?.data || []
  const categories = categoriesData?.data || []

  return (
    <div className="page-content" style={{ maxWidth: 780 }}>

      {/* ── Branding ── */}
      <Section icon={Image} title="Branding" color="var(--blue)">
        <div className="glass-card" style={{ padding: 20 }}>
          <div className="form-group">
            <label className="form-label">Custom Logo</label>
            <div style={{ display: 'flex', gap: 14, alignItems: 'center', marginTop: 6 }}>
              {/* Preview */}
              <div style={{
                width: 52, height: 52, borderRadius: 14, overflow: 'hidden', flexShrink: 0,
                background: currentSettings.app_logo ? 'transparent' : 'linear-gradient(145deg, #0a0a0a 0%, #0f0f12 100%)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: '0 4px 16px rgba(0,0,0,0.5)',
                border: '1px solid rgba(255,255,255,0.09)',
              }}>
                {currentSettings.app_logo ? (
                  <img src={currentSettings.app_logo} alt="logo" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  <img src="/icon.svg" alt="AI Locker" style={{ width: 28, height: 28 }} />
                )}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 8 }}>
                  Upload a custom logo (PNG, JPG, SVG — max 500KB). It will appear in the sidebar.
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button className="btn btn-glass btn-sm" onClick={() => logoInputRef.current?.click()}>
                    <Upload size={12} /> Upload Logo
                  </button>
                  {currentSettings.app_logo && (
                    <button className="btn btn-danger btn-sm" onClick={() => set('app_logo', '')}>
                      <X size={12} /> Remove
                    </button>
                  )}
                </div>
              </div>
              <input ref={logoInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleLogoUpload} />
            </div>
          </div>
        </div>
      </Section>

      {/* ── Appearance ── */}
      <Section icon={Palette} title="Appearance" color="var(--purple)">
        <div className="glass-card" style={{ padding: 20 }}>
          <div className="form-group">
            <label className="form-label">Accent Color</label>
            <div style={{ marginTop: 8 }}>
              <ColorSwatches
                value={currentSettings.accent_color || '#007AFF'}
                onChange={(v) => set('accent_color', v)}
                colors={ACCENT_COLORS.map(c => c.value)}
                size="lg"
              />
            </div>
          </div>
        </div>
      </Section>

      {/* ── AI Integration ── */}
      <Section icon={Sparkles} title="AI Integration" color="var(--green)">
        <div className="glass-card" style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 20 }}>

          {/* Provider selector */}
          <div className="form-group" style={{ margin: 0 }}>
            <label className="form-label" style={{ marginBottom: 10, display: 'block' }}>Provider</label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: 8 }}>
              {AI_PROVIDERS.map(p => {
                const active = (currentSettings.ai_provider || 'openrouter') === p.id
                return (
                  <button
                    key={p.id}
                    onClick={() => {
                      set('ai_provider', p.id)
                      if (p.defaultModel) set('ai_model', p.defaultModel)
                      if (p.baseUrl) set('ai_base_url', p.baseUrl)
                    }}
                    style={{
                      padding: '10px 14px',
                      borderRadius: 10,
                      border: `1.5px solid ${active ? p.color : 'var(--glass-border)'}`,
                      background: active ? `${p.color}12` : 'var(--glass-bg)',
                      cursor: 'pointer',
                      display: 'flex', alignItems: 'center', gap: 8,
                      transition: 'all 0.15s',
                    }}
                  >
                    <span style={{ display: 'flex', alignItems: 'center', flexShrink: 0 }}>{p.icon}</span>
                    <div style={{ textAlign: 'left' }}>
                      <div style={{ fontSize: 12, fontWeight: 600, color: active ? p.color : 'var(--text-primary)' }}>{p.label}</div>
                      <div style={{ fontSize: 10, color: 'var(--text-quaternary)', marginTop: 1 }}>{p.hint}</div>
                    </div>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Bedrock: AWS credentials */}
          {(currentSettings.ai_provider || 'openrouter') === 'bedrock' ? (
            <>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label">AWS Access Key ID</label>
                  <input className="form-input" type="text" placeholder="AKIA…" value={currentSettings.ai_aws_access_key_id || ''} onChange={e => set('ai_aws_access_key_id', e.target.value)} style={{ marginTop: 6 }} />
                </div>
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label">AWS Region</label>
                  <select className="form-select" value={currentSettings.ai_aws_region || 'us-east-1'} onChange={e => set('ai_aws_region', e.target.value)} style={{ marginTop: 6 }}>
                    {['us-east-1','us-west-2','eu-west-1','eu-central-1','ap-northeast-1','ap-southeast-1','ap-southeast-2'].map(r => <option key={r} value={r}>{r}</option>)}
                  </select>
                </div>
              </div>
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label">AWS Secret Access Key</label>
                <div style={{ position: 'relative', marginTop: 6 }}>
                  <input className="form-input" type={showAiKey ? 'text' : 'password'} placeholder="Your AWS Secret Access Key" value={currentSettings.ai_aws_secret_access_key || ''} onChange={e => set('ai_aws_secret_access_key', e.target.value)} style={{ paddingRight: 36 }} />
                  <button onClick={() => setShowAiKey(v => !v)} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-tertiary)', display: 'flex' }}>
                    {showAiKey ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                </div>
                <div style={{ fontSize: 11, color: 'var(--text-quaternary)', marginTop: 6 }}>
                  Credentials are stored locally and used only for Bedrock API calls.
                </div>
              </div>
            </>
          ) : (currentSettings.ai_provider || 'openrouter') === 'openrouter' ? (
            /* OpenRouter: API key + custom base URL */
            <>
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label">OpenRouter API Key</label>
                <div style={{ position: 'relative', marginTop: 6 }}>
                  <input className="form-input" type={showAiKey ? 'text' : 'password'} placeholder="sk-or-v1-…" value={currentSettings.ai_api_key || ''} onChange={e => set('ai_api_key', e.target.value)} style={{ paddingRight: 36 }} />
                  <button onClick={() => setShowAiKey(v => !v)} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-tertiary)', display: 'flex' }}>
                    {showAiKey ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                </div>
                <div style={{ fontSize: 11, color: 'var(--text-quaternary)', marginTop: 6 }}>
                  Get your key at <a href="https://openrouter.ai/keys" target="_blank" rel="noreferrer" style={{ color: 'var(--blue-light)' }}>openrouter.ai/keys</a> · Access to all providers in one key
                </div>
              </div>
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label">Base URL <span style={{ fontSize: 10, color: 'var(--text-quaternary)', fontWeight: 400 }}>(optional — override for self-hosted)</span></label>
                <input className="form-input" placeholder="https://openrouter.ai/api/v1" value={currentSettings.ai_base_url || 'https://openrouter.ai/api/v1'} onChange={e => set('ai_base_url', e.target.value)} style={{ marginTop: 6 }} />
              </div>
            </>
          ) : (
            /* All other providers: single API key field */
            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">
                {AI_PROVIDERS.find(p => p.id === (currentSettings.ai_provider || 'openrouter'))?.label || 'AI'} API Key
              </label>
              <div style={{ position: 'relative', marginTop: 6 }}>
                <input className="form-input" type={showAiKey ? 'text' : 'password'}
                  placeholder={AI_PROVIDERS.find(p => p.id === (currentSettings.ai_provider))?.keyPlaceholder || 'sk-…'}
                  value={currentSettings.ai_api_key || ''} onChange={e => set('ai_api_key', e.target.value)} style={{ paddingRight: 36 }} />
                <button onClick={() => setShowAiKey(v => !v)} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-tertiary)', display: 'flex' }}>
                  {showAiKey ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
              {AI_PROVIDERS.find(p => p.id === currentSettings.ai_provider)?.docsUrl && (
                <div style={{ fontSize: 11, color: 'var(--text-quaternary)', marginTop: 6 }}>
                  Get your key at <a href={AI_PROVIDERS.find(p => p.id === currentSettings.ai_provider).docsUrl} target="_blank" rel="noreferrer" style={{ color: 'var(--blue-light)' }}>{AI_PROVIDERS.find(p => p.id === currentSettings.ai_provider).docsUrl.replace('https://', '')}</a>
                </div>
              )}
            </div>
          )}

          {/* Model selector (always shown) */}
          <div className="form-group" style={{ margin: 0 }}>
            <label className="form-label">Model</label>
            <ModelSelector
              value={currentSettings.ai_model || AI_PROVIDERS.find(p => p.id === (currentSettings.ai_provider || 'openrouter'))?.defaultModel || 'openai/gpt-4o-mini'}
              onChange={(v) => set('ai_model', v)}
              placeholder="Search or type a model ID…"
              providerFilter={currentSettings.ai_provider || 'openrouter'}
            />
            <div style={{ fontSize: 11, color: 'var(--text-quaternary)', marginTop: 6 }}>
              Latest models — March 2026 · Type any ID for a custom model
            </div>
          </div>
        </div>
      </Section>

      {/* ── AI Defaults ── */}
      <Section icon={Cpu} title="AI Defaults" color="var(--teal)">
        <div className="glass-card" style={{ padding: 20 }}>
          <div className="form-group">
            <label className="form-label">Default Model</label>
            <ModelSelector
              value={currentSettings.default_model || ''}
              onChange={(v) => set('default_model', v)}
              placeholder="Search or type a model…"
            />
            <div style={{ fontSize: 11, color: 'var(--text-quaternary)', marginTop: 6 }}>
              Models updated March 2026 · Type any model ID to use a custom one
            </div>
          </div>
        </div>
      </Section>

      {/* ── Categories ── */}
      <Section icon={FolderOpen} title="Categories" color="var(--orange)">
        <div className="glass-card" style={{ padding: 20 }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
            {categories.map(cat => (
              <div key={cat.id} style={{
                display: 'flex', alignItems: 'center', gap: 6,
                background: `${cat.color}18`, border: `1px solid ${cat.color}40`,
                borderRadius: 'var(--radius-full)', padding: '4px 10px 4px 8px',
              }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: cat.color, flexShrink: 0 }} />
                <span style={{ fontSize: 12, color: cat.color, fontWeight: 500 }}>{cat.name}</span>
                {!cat.id.startsWith('cat-') && (
                  <button onClick={() => deleteCatMutation.mutate(cat.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: cat.color, opacity: 0.6, padding: 0, display: 'flex' }}>
                    <X size={11} />
                  </button>
                )}
              </div>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <input
              className="form-input"
              placeholder="New category name"
              value={newCat.name}
              onChange={e => setNewCat(c => ({ ...c, name: e.target.value }))}
              onKeyDown={e => e.key === 'Enter' && newCat.name && createCatMutation.mutate(newCat)}
              style={{ flex: 1 }}
            />
            <ColorSwatches
              value={newCat.color}
              onChange={(c) => setNewCat(nc => ({ ...nc, color: c }))}
              colors={TAG_COLORS.slice(0, 8)}
            />
            <button className="btn btn-primary btn-sm" onClick={() => newCat.name && createCatMutation.mutate(newCat)} disabled={!newCat.name}>
              <Plus size={13} /> Add
            </button>
          </div>
        </div>
      </Section>

      {/* ── Tags ── */}
      <Section icon={Tag} title="Tags" color="var(--indigo)">
        <div className="glass-card" style={{ padding: 20 }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
            {tags.map(tag => (
              <div key={tag.id} style={{
                display: 'flex', alignItems: 'center', gap: 6,
                background: `${tag.color}18`, border: `1px solid ${tag.color}40`,
                borderRadius: 'var(--radius-full)', padding: '4px 10px 4px 8px',
              }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: tag.color, flexShrink: 0 }} />
                <span style={{ fontSize: 12, color: tag.color, fontWeight: 500 }}>{tag.name}</span>
                <button onClick={() => deleteTagMutation.mutate(tag.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: tag.color, opacity: 0.6, padding: 0, display: 'flex' }}>
                  <X size={11} />
                </button>
              </div>
            ))}
            {tags.length === 0 && <span style={{ fontSize: 13, color: 'var(--text-tertiary)' }}>No tags yet</span>}
          </div>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <input
              className="form-input"
              placeholder="New tag name"
              value={newTag.name}
              onChange={e => setNewTag(t => ({ ...t, name: e.target.value }))}
              onKeyDown={e => e.key === 'Enter' && newTag.name && createTagMutation.mutate(newTag)}
              style={{ flex: 1 }}
            />
            <ColorSwatches
              value={newTag.color}
              onChange={(c) => setNewTag(nt => ({ ...nt, color: c }))}
              colors={TAG_COLORS.slice(0, 8)}
            />
            <button className="btn btn-primary btn-sm" onClick={() => newTag.name && createTagMutation.mutate(newTag)} disabled={!newTag.name}>
              <Plus size={13} /> Add
            </button>
          </div>
        </div>
      </Section>

      {/* ── Library Export / Import ── */}
      <Section icon={PackageOpen} title="Library Export / Import" color="var(--blue)">
        <div className="glass-card" style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
            Export your entire library as a portable JSON file. Import it on any AI Locker instance to restore or share your collection.
          </div>

          {/* Export */}
          <div style={{ borderBottom: '1px solid rgba(255,255,255,0.07)', paddingBottom: 16 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 12 }}>Export</div>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
              <button
                className="btn btn-primary btn-sm"
                onClick={() => {
                  backupApi.exportJson()
                  toast.success('Library exported!')
                }}
                style={{ gap: 6 }}
              >
                <Download size={13} /> Export Full Library
              </button>
              <span style={{ fontSize: 12, color: 'var(--text-quaternary)' }}>
                Includes prompts, skills, steering, MCP configs, commands & notes
              </span>
            </div>
          </div>

          {/* Import */}
          <div>
            <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 12 }}>Import</div>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
              <label className="btn btn-glass btn-sm" style={{ cursor: 'pointer', gap: 6 }}>
                <Upload size={13} /> Choose File
                <input
                  type="file"
                  accept=".json"
                  style={{ display: 'none' }}
                  onChange={handleImportFile}
                />
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--text-secondary)', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={importMerge}
                  onChange={e => setImportMerge(e.target.checked)}
                  style={{ accentColor: 'var(--blue)' }}
                />
                Merge mode <span style={{ color: 'var(--text-quaternary)' }}>(keep existing items)</span>
              </label>
            </div>
            <div style={{ marginTop: 10, fontSize: 11, color: 'var(--text-quaternary)', lineHeight: 1.6 }}>
              {importMerge
                ? '⚡ Merge: existing items are kept, only new items are added.'
                : '⚠️ Replace: existing items with the same ID will be overwritten.'}
            </div>
          </div>
        </div>
      </Section>

      {/* ── Database ── */}
      <Section icon={Database} title="Database" color="var(--green)">
        <div className="glass-card" style={{ padding: 20 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(110px, 1fr))', gap: 12, marginBottom: 16 }}>
            {[
              { label: 'Prompts', value: stats?.prompts ?? 0, color: 'var(--blue)' },
              { label: 'Skills', value: stats?.skills ?? 0, color: 'var(--orange)' },
              { label: 'Steering', value: stats?.steering ?? 0, color: 'var(--purple)' },
              { label: 'MCP Configs', value: stats?.mcp_configs ?? 0, color: 'var(--green)' },
              { label: 'Tags', value: stats?.tags ?? 0, color: 'var(--teal)' },
            ].map(({ label, value, color }) => (
              <div key={label} style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 'var(--radius-lg)', padding: '12px 14px', textAlign: 'center' }}>
                <div style={{ fontSize: 22, fontWeight: 700, color, letterSpacing: -0.5 }}>{value}</div>
                <div style={{ fontSize: 11, color: 'var(--text-tertiary)', marginTop: 2 }}>{label}</div>
              </div>
            ))}
          </div>

          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <button className="btn btn-glass btn-sm" onClick={() => backupApi.exportJson()}>
              <Download size={13} /> Export JSON
            </button>
            <label className="btn btn-glass btn-sm" style={{ cursor: 'pointer' }}>
              <Upload size={13} />
              <span>Import JSON</span>
              <input ref={fileInputRef} type="file" accept=".json" style={{ display: 'none' }} onChange={handleImportFile} />
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--text-secondary)', cursor: 'pointer' }}>
              <input type="checkbox" checked={importMerge} onChange={e => setImportMerge(e.target.checked)} style={{ accentColor: 'var(--blue)' }} />
              Merge (keep existing)
            </label>
          </div>
        </div>
      </Section>

      {/* ── S3-Compatible Storage ── */}
      <Section icon={Cloud} title="S3 Backup & Sync" color="var(--orange)">
        <div className="glass-card" style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Status — always visible, uses default state while loading */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', background: s3Status?.configured ? 'rgba(48,209,88,0.08)' : 'rgba(255,255,255,0.04)', border: `1px solid ${s3Status?.configured ? 'rgba(48,209,88,0.2)' : 'rgba(255,255,255,0.08)'}`, borderRadius: 'var(--radius-md)' }}>
            <div className={`status-dot ${s3Status?.configured ? 'active' : 'inactive'}`} />
            <span style={{ fontSize: 13, color: s3Status?.configured ? 'var(--green)' : 'var(--text-tertiary)' }}>
              {s3Status ? (s3Status.configured ? `Connected · s3://${s3Status.bucket}` : 'Not configured') : 'Loading…'}
            </span>
            {s3Status?.last_sync && (
              <span style={{ fontSize: 11, color: 'var(--text-quaternary)', marginLeft: 'auto' }}>
                Last sync: {formatDistanceToNow(new Date(s3Status.last_sync), { addSuffix: true })}
              </span>
            )}
          </div>

          {/* Provider quick-select */}
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {[
              { label: 'AWS S3',       endpoint: '',                                          match: null },
              { label: 'Cloudflare R2', endpoint: 'https://<account>.r2.cloudflarestorage.com', match: 'cloudflarestorage' },
              { label: 'Backblaze B2', endpoint: 'https://s3.<region>.backblazeb2.com',        match: 'backblazeb2' },
              { label: 'MinIO',        endpoint: 'http://localhost:9000',                      match: 'localhost' },
            ].map(p => {
              const current = s3Config.endpoint ?? (currentSettings.s3_endpoint || '')
              const active = p.match === null ? !current : (!!current && current.includes(p.match))
              return (
                <button key={p.label}
                  onClick={() => setS3Config(c => ({ ...c, endpoint: p.endpoint }))}
                  className={`filter-chip ${active ? 'active' : ''}`}
                  style={{ fontSize: 11 }}>
                  {p.label}
                </button>
              )
            })}
          </div>

          <div className="form-grid-2col" style={{ gap: 14 }}>
            <div className="form-group">
              <label className="form-label">Bucket</label>
              <input className="form-input" placeholder="my-bucket" value={s3Config.bucket ?? (currentSettings.s3_bucket || '')} onChange={e => setS3Config(c => ({ ...c, bucket: e.target.value }))} />
            </div>
            <div className="form-group">
              <label className="form-label">Region</label>
              <select className="form-select" value={s3Config.region ?? (currentSettings.s3_region || 'us-east-1')} onChange={e => setS3Config(c => ({ ...c, region: e.target.value }))}>
                {S3_REGIONS.map(r => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Access Key ID</label>
              <input className="form-input" placeholder="AKIA..." type="password" value={s3Config.access_key ?? (currentSettings.s3_access_key || '')} onChange={e => setS3Config(c => ({ ...c, access_key: e.target.value }))} />
            </div>
            <div className="form-group">
              <label className="form-label">Secret Access Key</label>
              <input className="form-input" placeholder="••••••••" type="password" value={s3Config.secret_key ?? (currentSettings.s3_secret_key || '')} onChange={e => setS3Config(c => ({ ...c, secret_key: e.target.value }))} />
            </div>
            <div className="form-group">
              <label className="form-label">Prefix / Path</label>
              <input className="form-input" placeholder="promptly-backups/" value={s3Config.prefix ?? (currentSettings.s3_prefix || 'promptly-backups/')} onChange={e => setS3Config(c => ({ ...c, prefix: e.target.value }))} />
            </div>
            <div className="form-group">
              <label className="form-label">Custom Endpoint <span style={{ fontWeight: 400, color: 'var(--text-quaternary)' }}>(opcional · R2, B2, MinIO…)</span></label>
              <input className="form-input" placeholder="https://… (leave empty for AWS)" value={s3Config.endpoint ?? (currentSettings.s3_endpoint || '')} onChange={e => setS3Config(c => ({ ...c, endpoint: e.target.value }))} />
            </div>
          </div>

          {s3TestResult && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', background: s3TestResult.ok ? 'rgba(48,209,88,0.1)' : 'rgba(255,55,95,0.1)', border: `1px solid ${s3TestResult.ok ? 'rgba(48,209,88,0.3)' : 'rgba(255,55,95,0.3)'}`, borderRadius: 'var(--radius-md)', fontSize: 13 }}>
              {s3TestResult.ok ? <Check size={14} color="var(--green)" /> : <AlertCircle size={14} color="var(--pink)" />}
              <span style={{ color: s3TestResult.ok ? 'var(--green)' : 'var(--pink)' }}>{s3TestResult.msg}</span>
            </div>
          )}

          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <button className="btn btn-glass btn-sm" onClick={handleTestS3} disabled={testingS3}>
              {testingS3 ? <span className="spinner" style={{ width: 12, height: 12 }} /> : <Check size={13} />}
              Test Connection
            </button>
            <button className="btn btn-glass btn-sm" onClick={handleSaveS3}>
              <Save size={13} /> Save S3 Config
            </button>
            <button className="btn btn-primary btn-sm" onClick={() => s3UploadMutation.mutate()} disabled={s3UploadMutation.isPending || !currentSettings.s3_bucket}>
              {s3UploadMutation.isPending ? <span className="spinner" style={{ width: 12, height: 12 }} /> : <Upload size={13} />}
              Backup Now
            </button>
            <button className="btn btn-glass btn-sm" onClick={() => { setShowS3Files(true); refetchS3() }} disabled={!currentSettings.s3_bucket}>
              <Cloud size={13} /> Browse Backups
            </button>
          </div>

          {/* Auto-sync */}
          <div style={{ borderTop: '1px solid rgba(255,255,255,0.07)', paddingTop: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 500 }}>Auto-sync to S3</div>
                <div style={{ fontSize: 11, color: 'var(--text-tertiary)', marginTop: 2 }}>Automatically backup to S3 on a schedule</div>
              </div>
              <label className="toggle">
                <input type="checkbox" checked={currentSettings.sync_enabled === 'true'} onChange={e => {
                  const val = e.target.checked ? 'true' : 'false'
                  updateMutation.mutate({ sync_enabled: val })
                  setLocalSettings(ls => { const n = { ...ls }; delete n.sync_enabled; return n })
                }} />
                <span className="toggle-slider" />
              </label>
            </div>
            {currentSettings.sync_enabled === 'true' && (
              <div className="form-group">
                <label className="form-label">Sync Interval</label>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {[15, 30, 60, 120, 180, 360, 540, 720, 1440, 2880].map(m => {
                    const label = m < 60 ? `${m}m` : m < 1440 ? `${m / 60}h` : `${m / 1440}d`
                    return (
                      <button key={m} className={`filter-chip ${(currentSettings.sync_interval || '60') === String(m) ? 'active' : ''}`}
                        onClick={() => {
                          updateMutation.mutate({ sync_interval: String(m) })
                          setLocalSettings(ls => { const n = { ...ls }; delete n.sync_interval; return n })
                        }}>
                        {label}
                      </button>
                    )
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      </Section>

      {/* ── API Key Protection ── */}
      <Section icon={Key} title="API Key Protection" color="var(--indigo)">
        <div className="glass-card" style={{ padding: 20 }}>
          <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 12, lineHeight: 1.6 }}>
            To protect your instance, set <code style={{ fontFamily: 'var(--font-mono)', background: 'rgba(255,255,255,0.06)', padding: '1px 6px', borderRadius: 4 }}>API_KEY=your-secret</code> in the server's <code style={{ fontFamily: 'var(--font-mono)', background: 'rgba(255,255,255,0.06)', padding: '1px 6px', borderRadius: 4 }}>.env</code> file. The frontend will automatically send it with every request when you save it here.
          </div>
          <div className="form-group">
            <label className="form-label">Bearer Token (client-side)</label>
            <input
              className="form-input"
              type="password"
              placeholder="Your API_KEY value…"
              defaultValue={localStorage.getItem('promptly_api_key') || ''}
              onBlur={e => {
                const val = e.target.value.trim()
                if (val) localStorage.setItem('promptly_api_key', val)
                else localStorage.removeItem('promptly_api_key')
              }}
              style={{ marginTop: 6 }}
            />
            <div style={{ fontSize: 11, color: 'var(--text-quaternary)', marginTop: 6 }}>Stored in your browser's localStorage. Clear to disable.</div>
          </div>
        </div>
      </Section>

      {/* ── Danger Zone ── */}
      <section style={{ marginBottom: 28 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
          <ShieldAlert size={16} color="var(--pink)" />
          <h2 style={{ fontSize: 14, fontWeight: 600, letterSpacing: 0.1 }}>Danger Zone</h2>
        </div>
        <div className="glass-card" style={{ padding: 20, border: '1px solid rgba(255,55,95,0.15)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 3 }}>Reset settings to defaults</div>
              <div style={{ fontSize: 12, color: 'var(--text-tertiary)', lineHeight: 1.5 }}>
                Restores appearance, model, and S3 config to their original values. Your library data is not affected.
              </div>
            </div>
            {!resetConfirm ? (
              <button
                className="btn btn-glass btn-sm"
                onClick={() => setResetConfirm(true)}
                style={{ gap: 6, flexShrink: 0, borderColor: 'rgba(255,55,95,0.25)', color: 'var(--pink)' }}
              >
                <RotateCcw size={13} /> Reset
              </button>
            ) : (
              <div style={{ display: 'flex', gap: 8, flexShrink: 0, alignItems: 'center' }}>
                <span style={{ fontSize: 12, color: 'var(--text-tertiary)', whiteSpace: 'nowrap' }}>Are you sure?</span>
                <button
                  className="btn btn-sm"
                  onClick={handleReset}
                  disabled={updateMutation.isPending}
                  style={{ gap: 5, background: 'rgba(255,55,95,0.15)', border: '1px solid rgba(255,55,95,0.3)', color: 'var(--pink)' }}
                >
                  <Check size={12} /> Yes, reset
                </button>
                <button className="btn btn-glass btn-sm" onClick={() => setResetConfirm(false)}>
                  <X size={12} />
                </button>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* ── About ── */}
      <Section icon={Info} title="About" color="var(--text-tertiary)">
        <div className="glass-card" style={{ padding: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{
              width: 48, height: 48, borderRadius: 14, overflow: 'hidden', flexShrink: 0,
              background: currentSettings.app_logo ? 'none' : 'linear-gradient(145deg, #0a0a0a 0%, #0f0f12 100%)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 4px 16px rgba(0,0,0,0.5)',
              border: '1px solid rgba(255,255,255,0.09)',
            }}>
              {currentSettings.app_logo ? (
                <img src={currentSettings.app_logo} alt="logo" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                <img src="/icon.svg" alt="AI Locker" style={{ width: 28, height: 28 }} />
              )}
            </div>
            <div>
              <div style={{ fontSize: 16, fontWeight: 700, letterSpacing: -0.3 }}>{currentSettings.app_name || 'AI Locker'}</div>
              <div style={{ fontSize: 13, color: 'var(--text-tertiary)' }}>AI Prompts Manager · v1.0.0</div>
            </div>
          </div>
        </div>
      </Section>

      {/* ── S3 Files Modal ── */}
      <Modal isOpen={showS3Files} onClose={() => setShowS3Files(false)} title="S3 Backups" size="md">
        {!s3Files ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}><div className="spinner" /></div>
        ) : s3Files.data?.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-tertiary)' }}>No backups found</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {s3Files.data?.map(file => (
              <div key={file.key} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 'var(--radius-md)' }}>
                <Cloud size={14} color="var(--teal)" />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 500, truncate: true }}>{file.filename}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>
                    {(file.size / 1024).toFixed(1)} KB · {formatDistanceToNow(new Date(file.last_modified), { addSuffix: true })}
                  </div>
                </div>
                <button className="btn btn-glass btn-sm" onClick={() => { s3RestoreMutation.mutate({ key: file.key, merge: false }); setShowS3Files(false) }}>
                  <Download size={12} /> Restore
                </button>
              </div>
            ))}
          </div>
        )}
      </Modal>

      {/* ── Floating Save ── */}
      {hasChanges && (
        <div className="settings-save-bar" style={{ animation: 'slideUp 0.2s ease-out' }}>
          <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Unsaved changes</span>
          <button className="btn btn-glass btn-sm" onClick={() => setLocalSettings({})}>Discard</button>
          <button className="btn btn-primary btn-sm" onClick={handleSave} disabled={updateMutation.isPending}>
            <Save size={13} /> Save
          </button>
        </div>
      )}
    </div>
  )
}

import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Button from '@/components/common/Button'
import { useCardStore } from '@/stores/useCardStore'
import { useToastStore } from '@/stores/useToastStore'
import { loadProjects, deleteProject } from '@/lib/projectService'
import type { CardNewsProject } from '@/types'

const CATEGORY_LABELS: Record<string, string> = {
  ai: 'AI',
  stocks: '주식',
  war: '전쟁'
}

export default function ProjectsPage() {
  const [projects, setProjects] = useState<CardNewsProject[]>([])
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()
  const { setSlides, setLayout } = useCardStore()
  const addToast = useToastStore((s) => s.addToast)

  const fetchProjects = async () => {
    setLoading(true)
    const data = await loadProjects()
    setProjects(data)
    setLoading(false)
  }

  useEffect(() => {
    fetchProjects()
  }, [])

  const handleOpen = (project: CardNewsProject) => {
    setSlides(project.slides)
    setLayout(project.selected_layout)
    navigate('/editor')
    addToast('success', `"${project.title}" 프로젝트를 불러왔습니다.`)
  }

  const handleDelete = async (id: string, title: string) => {
    if (!confirm(`"${title}" 프로젝트를 삭제하시겠습니까?`)) return
    const ok = await deleteProject(id)
    if (ok) {
      setProjects((prev) => prev.filter((p) => p.id !== id))
      addToast('success', '프로젝트가 삭제되었습니다.')
    } else {
      addToast('error', '삭제에 실패했습니다.')
    }
  }

  const formatDate = (iso: string) => {
    const d = new Date(iso)
    return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`
  }

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-3 border-blue-accent border-t-transparent" />
          <span className="text-sm text-text-light dark:text-gray-400">프로젝트 불러오는 중...</span>
        </div>
      </div>
    )
  }

  return (
    <div className="h-full overflow-y-auto">
      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-2xl font-bold text-text-dark dark:text-white">저장된 프로젝트</h2>
        <Button variant="secondary" size="sm" onClick={fetchProjects}>
          새로고침
        </Button>
      </div>

      {projects.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-text-light dark:text-gray-500">
          <span className="mb-3 text-5xl">📁</span>
          <p className="text-lg font-medium">저장된 프로젝트가 없습니다</p>
          <p className="mt-1 text-sm">카드를 편집한 후 클라우드에 저장해보세요</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {projects.map((project) => (
            <div
              key={project.id}
              className="group rounded-xl border border-cream-dark bg-white p-5 transition-all hover:shadow-md dark:border-gray-600 dark:bg-gray-800"
            >
              <div className="mb-3 flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <h3 className="truncate text-base font-bold text-text-dark dark:text-white">
                    {project.title || '제목 없음'}
                  </h3>
                  <div className="mt-1 flex items-center gap-2">
                    {project.category && (
                      <span className="rounded-full bg-blue-accent/10 px-2 py-0.5 text-xs font-medium text-blue-accent">
                        {CATEGORY_LABELS[project.category] || project.category}
                      </span>
                    )}
                    <span className="text-xs text-text-light dark:text-gray-500">
                      {project.slides.length}장
                    </span>
                  </div>
                </div>
              </div>

              <p className="mb-3 line-clamp-2 text-sm text-text-gray dark:text-gray-400">
                {project.slides[0]?.description || project.slides[0]?.title || ''}
              </p>

              <div className="flex items-center justify-between">
                <span className="text-xs text-text-light dark:text-gray-500">
                  {formatDate(project.updated_at)}
                </span>
                <div className="flex gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDelete(project.id, project.title)}
                  >
                    삭제
                  </Button>
                  <Button size="sm" onClick={() => handleOpen(project)}>
                    불러오기
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

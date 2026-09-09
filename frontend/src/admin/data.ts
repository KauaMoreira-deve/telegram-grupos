export type GroupStatus = 'Ativo' | 'Inativo'

export type Group = {
  id: number
  name: string
  category: string
  status: GroupStatus
  featured: boolean
  createdAt: string
  members: string
  initials: string
  color: string
}

export type Category = {
  id: number
  name: string
  slug: string
  status: GroupStatus
  groupCount: number
}

export const initialGroups: Group[] = [
  { id: 1, name: 'Dev Brasil', category: 'Tecnologia', status: 'Ativo', featured: true, createdAt: '08 set. 2026', members: '18,4 mil membros', initials: 'DB', color: '#5b62e8' },
  { id: 2, name: 'Empreendedores BR', category: 'Negócios', status: 'Ativo', featured: true, createdAt: '07 set. 2026', members: '12,8 mil membros', initials: 'EB', color: '#d16b3e' },
  { id: 3, name: 'Vagas em Tecnologia', category: 'Carreira', status: 'Ativo', featured: false, createdAt: '06 set. 2026', members: '9,2 mil membros', initials: 'VT', color: '#269273' },
  { id: 4, name: 'Clube do Livro', category: 'Educação', status: 'Inativo', featured: false, createdAt: '04 set. 2026', members: '4,6 mil membros', initials: 'CL', color: '#a44ab6' },
  { id: 5, name: 'Marketing sem Segredo', category: 'Marketing', status: 'Ativo', featured: false, createdAt: '02 set. 2026', members: '7,1 mil membros', initials: 'MS', color: '#157cbd' },
  { id: 6, name: 'Investimentos para Todos', category: 'Finanças', status: 'Ativo', featured: true, createdAt: '30 ago. 2026', members: '15,2 mil membros', initials: 'IT', color: '#c3932c' },
]

export const initialCategories: Category[] = [
  { id: 1, name: 'Tecnologia', slug: 'tecnologia', status: 'Ativo', groupCount: 18 },
  { id: 2, name: 'Negócios', slug: 'negocios', status: 'Ativo', groupCount: 14 },
  { id: 3, name: 'Carreira', slug: 'carreira', status: 'Ativo', groupCount: 10 },
  { id: 4, name: 'Educação', slug: 'educacao', status: 'Ativo', groupCount: 9 },
  { id: 5, name: 'Marketing', slug: 'marketing', status: 'Inativo', groupCount: 5 },
]

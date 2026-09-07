/**
 * Editorial team authors — single source of truth for blog bylines and About page.
 */
export interface Author {
  name: string;
  role: string;
  roleVi: string;
  roleTh: string;
  roleId: string;
  bio: string;
  initials: string;
  slug: string;
}

export const AUTHORS: Record<string, Author> = {
  'mei-lin': {
    name: 'Mei Lin',
    role: 'Editor-in-Chief',
    roleVi: 'Tổng biên tập',
    roleTh: 'บรรณาธิการบริหาร',
    roleId: 'Pemimpin Redaksi',
    bio: "Mei Lin is CDramaBinge's editor-in-chief. A former film journalist, she has watched over 400 Chinese dramas and writes about historical epics, xianxia, and the craft of long-form television storytelling.",
    initials: 'ML',
    slug: 'mei-lin',
  },
  'daniel-park': {
    name: 'Daniel Park',
    role: 'Staff Writer, Modern & Romance',
    roleVi: 'Biên tập viên, Hiện đại & Lãng mạn',
    roleTh: 'นักเขียนประจำ หมวดโรแมนติกและชีวิตสมัยใหม่',
    roleId: 'Penulis Staf, Modern & Romansa',
    bio: "Daniel came to Chinese drama through romantic comedies during the pandemic and never left. He specializes in modern romance, youth dramas, and the short-form miniseries format.",
    initials: 'DP',
    slug: 'daniel-park',
  },
  'sirin-srivikorn': {
    name: 'Sirin "Nok" Srivikorn',
    role: 'Contributor, Southeast Asia Desk',
    roleVi: 'Cộng tác viên, Bàn Đông Nam Á',
    roleTh: 'ผู้ร่วมเขียน ประจำโต๊ะเอเชียตะวันออกเฉียงใต้',
    roleId: 'Kontributor, Meja Asia Tenggara',
    bio: "Based in Bangkok, Nok covers how Chinese dramas land with viewers across Southeast Asia — Thailand, Vietnam, and Indonesia in particular. She tracks regional streaming trends and subtitle quality.",
    initials: 'SN',
    slug: 'sirin-srivikorn',
  },
};

/** Lookup author by display name (for blog frontmatter backward compat) */
export function getAuthorByName(name: string): Author | undefined {
  return Object.values(AUTHORS).find(a => a.name === name);
}

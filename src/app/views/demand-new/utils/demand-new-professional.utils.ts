export function normalizeProfessionalForCitation(raw: any): any {
  const programs = Array.isArray(raw?.programs)
    ? raw.programs
        .filter((program: any) => program && !program.deletedAt)
        .map((program: any) => ({
          id: Number(program.id),
          name: String(
            program.name ?? program.nombre ?? `Programa ${program.id}`,
          ),
        }))
    : [];

  const programIds = Array.isArray(raw?.programIds)
    ? raw.programIds
        .map((id: any) => Number(id))
        .filter((id: number) => Number.isFinite(id))
    : programs.map((program: any) => program.id);

  return {
    ...raw,
    id: Number(raw?.id ?? raw?.professionalUserId ?? raw?.userId),
    name:
      raw?.name ?? raw?.nombre ?? raw?.fullName ?? 'Facultativo sin nombre',
    professionId:
      raw?.professionId ?? raw?.profession_id ?? raw?.profession?.id ?? null,
    professionName:
      raw?.professionName ??
      raw?.profession_name ??
      raw?.profession?.name ??
      raw?.profession?.nombre ??
      '',
    email: raw?.email ?? null,
    phone: raw?.phone ?? raw?.telefono ?? null,
    active: raw?.active,
    deletedAt: raw?.deletedAt ?? raw?.deleted_at ?? null,
    programIds,
    programs,
    programNames: programs.map((program: any) => program.name).join(', '),
  };
}

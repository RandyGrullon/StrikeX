# StrikeX

App de gestión de ligas de boliche: Expo (SDK 56) + expo-router + TypeScript + Supabase + React Query.

- Rutas en `src/app/` (expo-router, file-based). Alias `@/*` → `src/*`.
- Datos: hooks de lectura en `src/hooks/queries.ts`; escrituras con `supabase` directo + `queryClient.invalidateQueries`.
- Standings, promedios y handicap se calculan en vistas SQL (`supabase/migrations/001_schema.sql`), no en el cliente.
- UI kit propio en `src/components/ui.tsx`; tema oscuro en `src/lib/theme.ts`. Textos de la UI en español.
- Verificar con `npx tsc --noEmit` (la carpeta `supabase/functions` está excluida: es Deno).
- Credenciales en `.env` (`EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_ANON_KEY`).

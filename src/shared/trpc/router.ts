// App router - aggregates all domain routers.
// Every new domain registers its router here.

import { router } from './init';
import { healthRouter } from '$api/health/routes';
import { brandingRouter } from '$api/branding/routes';
import { projectRouter } from '$api/project/routes';
import { todoRouter } from '$api/todo/routes';
import { personRouter } from '$api/person/routes';
import { teamRouter } from '$api/team/routes';
import { departmentRouter } from '$api/department/routes';
import { docRouter } from '$api/doc/routes';
import { reportRouter } from '$api/report/routes';
import { noteRouter } from '$api/note/routes';
import { linkRouter } from '$api/link/routes';
import { tagRouter } from '$api/tag/routes';
import { commentRouter } from '$api/comment/routes';
import { emojiRouter } from '$api/emoji/routes';
import { trpcMetaRouter } from '$api/trpc-meta/routes';
import { homeRouter } from '$api/home/routes';

export const appRouter = router({
  health: healthRouter,
  home: homeRouter,
  branding: brandingRouter,
  project: projectRouter,
  todo: todoRouter,
  person: personRouter,
  team: teamRouter,
  department: departmentRouter,
  doc: docRouter,
  report: reportRouter,
  note: noteRouter,
  link: linkRouter,
  tag: tagRouter,
  comment: commentRouter,
  emoji: emojiRouter,
  trpcMeta: trpcMetaRouter
});

export type AppRouter = typeof appRouter;

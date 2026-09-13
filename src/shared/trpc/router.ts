// App router - aggregates all domain routers.
// Every new domain registers its router here.

import { router } from './init';
import { healthRouter } from '$api/health/routes';
import { brandingRouter } from '$api/branding/routes';
import { projectRouter } from '$api/project/routes';
import { goalRouter } from '$api/goal/routes';
import { pageRouter } from '$api/page/routes';
import { relationRouter } from '$api/relation/routes';
import { todoRouter } from '$api/aux/todo/routes';
import { personRouter } from '$api/org/person/routes';
import { teamRouter } from '$api/org/team/routes';
import { departmentRouter } from '$api/org/department/routes';
import { docRouter } from '$api/aux/doc/routes';
import { reportRouter } from '$api/aux/report/routes';
import { noteRouter } from '$api/aux/note/routes';
import { linkRouter } from '$api/aux/link/routes';
import { tagRouter } from '$api/aux/tag/routes';
import { commentRouter } from '$api/aux/comment/routes';
import { emojiRouter } from '$api/aux/emoji/routes';
import { trpcMetaRouter } from '$api/trpc-meta/routes';
import { homeRouter } from '$api/home/routes';
import { notebookRouter } from '$api/notebook/routes';

export const appRouter = router({
  notebook: notebookRouter,
  health: healthRouter,
  home: homeRouter,
  branding: brandingRouter,
  project: projectRouter,
  goal: goalRouter,
  page: pageRouter,
  relation: relationRouter,
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

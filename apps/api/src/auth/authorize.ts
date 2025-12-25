import { ApiError } from "../errors.js";
import type { SessionUser } from "./session.js";

/**
 * Gate1 目标：把鉴权入口统一收敛到一个函数里，避免到处散落 if/else。
 *
 * 真实项目：请对齐 `source/key_docs/权限矩阵.csv` 的权限矩阵，
 * 并把每个 route 所需 role/scope 写成 metadata。
 */
export function authorize(user: SessionUser, opts: { requireRoles?: string[] }) {
  const { requireRoles = [] } = opts;

  if (!user) throw new ApiError(401, "UNAUTHORIZED", "Unauthorized");

  if (requireRoles.length > 0) {
    const ok = requireRoles.some((r) => user.roles.includes(r));
    if (!ok) {
      // 这里默认 403；某些资源型接口建议 404（避免探测存在性）
      throw new ApiError(403, "FORBIDDEN", "Forbidden");
    }
  }
}

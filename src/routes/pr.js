import express from "express";
import { ensurePushed, getRemoteUrl, getRepoStatus } from "../services/gitService.js";
import { createPullRequest, parseBitbucketProjectRepo } from "../services/bitbucketService.js";
import { env } from "../utils/env.js";

export const prRouter = express.Router();

/**
 * Creates a PR for the current branch in a local repo.
 * Expects:
 * {
 *   "repoPath": "/path/to/repo",
 *   "baseBranch": "main" (optional),
 *   "title": "..." (optional),
 *   "description": "..." (optional),
 *   "reviewers": ["user1", "user2"] (optional)
 * }
 */
prRouter.post("/create", async (req, res) => {
  const repoPath = req.body?.repoPath;
  if (!repoPath) return res.status(400).json({ error: "repoPath is required" });

  const baseBranch = req.body?.baseBranch || env.DEFAULT_BASE_BRANCH;
  const title = req.body?.title || `DCC PR: ${new Date().toISOString()}`;
  const description = req.body?.description || "";
  const reviewers = Array.isArray(req.body?.reviewers) ? req.body.reviewers : [];

  // Ensure branch is pushed
  const branch = await ensurePushed(repoPath, "origin");

  // Parse Bitbucket project/repo from remote
  const remoteUrl = await getRemoteUrl(repoPath, "origin");
  const { projectKey, repoSlug } = parseBitbucketProjectRepo(remoteUrl);

  // Create PR
  const pr = await createPullRequest({
    projectKey,
    repoSlug,
    fromBranch: branch,
    toBranch: baseBranch,
    title,
    description,
    reviewers
  });

  const status = await getRepoStatus(repoPath);
  res.json({
    prUrl: pr.prUrl,
    projectKey,
    repoSlug,
    fromBranch: branch,
    toBranch: baseBranch,
    repoStatus: status
  });
});

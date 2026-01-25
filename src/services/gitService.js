import simpleGit from "simple-git";

/**
 * Minimal git wrapper used by the DCC.
 * Assumes the server runs on developer machine with access to the repo path.
 */
export async function getRepoStatus(repoPath) {
  const git = simpleGit(repoPath);
  const status = await git.status();
  return {
    currentBranch: status.current,
    isClean: status.isClean(),
    ahead: status.ahead,
    behind: status.behind
  };
}

export async function ensurePushed(repoPath, remoteName = "origin") {
  const git = simpleGit(repoPath);
  const status = await git.status();
  const branch = status.current;
  if (!branch) throw new Error("No current branch detected.");

  // if branch has upstream, push; otherwise set upstream
  const tracking = status.tracking; // e.g. origin/feature
  if (tracking) {
    await git.push(remoteName, branch);
  } else {
    await git.push(["-u", remoteName, branch]);
  }
  return branch;
}

export async function getRemoteUrl(repoPath, remoteName = "origin") {
  const git = simpleGit(repoPath);
  const remotes = await git.getRemotes(true);
  const origin = remotes.find(r => r.name === remoteName);
  if (!origin) throw new Error(`Remote '${remoteName}' not found.`);
  return origin.refs.fetch || origin.refs.push;
}

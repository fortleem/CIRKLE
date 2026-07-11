// @ts-nocheck
import "server-only";

/**
 * Face Recognition Datasets — Circle Verify ONLY
 * ============================================================================
 * Phase 7.5 — Autonomous Intelligence & Knowledge Engine (AIKE)
 *
 * ============================================================================
 * PRIVACY & CONSENT WARNING
 * ----------------------------------------------------------------------------
 * The datasets below contain BIOMETRIC FACE IMAGES. Biometric data is
 * classified as SPECIAL-CATEGORY personal data under GDPR Art. 9 and most
 * equivalent privacy regimes. Circle ingests these corpora SOLELY to train
 * the embedding model used by Circle Verify (the optional identity-verification
 * product) and NEVER to identify, profile, or surveil users of the main
 * Circle app.
 *
 * Hard rules enforced by the AIKE Brain:
 *   1. Every dataset below has `requiresApiKey: true` — the Brain MUST NOT
 *      download any face corpus until the operator has confirmed a valid
 *      research or commercial license for that specific dataset.
 *   2. The trained embedding model is the ONLY artifact that leaves the
 *      training pipeline. Raw face images are discarded immediately after
 *      training; they are never copied into the Brain's Knowledge Graph or
 *      cached in long-term storage.
 *   3. Circle Verify itself runs locally on the user's device where possible.
 *      If server-side verification is required, the user MUST grant explicit,
 *      separate, revocable consent each time — no implicit biometric reuse.
 *   4. Minors' faces are excluded from training by dataset-level filtering
 *      and by runtime age-gating in Circle Verify.
 *   5. Any model trained on these datasets is documented in the AIKE
 *      Provenance Ledger with the dataset list, license refs, and consent
 *      scope, so the user can request deletion under GDPR Art. 17.
 *
 * Backs the Circle Verify face-embedding model only.
 * Trust heuristic: institutionally curated academic corpora (80-90),
 * community-released corpora (75).
 * ============================================================================
 */
import type { DataSourceConfig } from "./types";

/** VGGFace2 — 3.3M face images of 9k identities, with pose/age variation (research license). */
export const vggFace2: DataSourceConfig = {
  id: "vggface2",
  name: "VGGFace2 Dataset",
  category: "partner_api",
  description:
    "VGGFace2 — 3.3 million face images of 9,131 subjects with large variations in pose, age, illumination, and ethnicity; the canonical academic benchmark for deep face recognition. Released under a research-only license; commercial use requires separate Oxford agreement.",
  urls: { download: "https://www.robots.ox.ac.uk/~vgg/data/vgg_face2/", docs: "https://www.robots.ox.ac.uk/~vgg/data/vgg_face2/" },
  trustScore: 85,
  format: "dump",
  updateFrequency: "yearly",
  integrationMethod: "dump_download",
  capabilities: ["face-detection", "face-recognition", "face-matching", "pose-invariant-embeddings", "age-variation-robustness"],
  coverage: ["global"],
  requiresApiKey: true,
  free: false,
};

/** MS1M (MS-Celeb-1M) — 10M face images of 100k public figures (license-restricted). */
export const ms1m: DataSourceConfig = {
  id: "ms1m-ms-celeb-1m",
  name: "MS-Celeb-1M (MS1M) Dataset",
  category: "partner_api",
  description:
    "MS-Celeb-1M — 10 million face images of 100,000 public figures harvested from the web. Microsoft has restricted redistribution; the cleaned MS1M subset is widely used for research but requires explicit license for any deployment. The Brain ingests ONLY under a verified research or commercial license.",
  urls: { docs: "https://www.msceleb.org/" },
  trustScore: 80,
  format: "dump",
  updateFrequency: "yearly",
  integrationMethod: "dump_download",
  capabilities: ["face-recognition", "face-matching", "large-scale-identification", "embedding-pretraining"],
  coverage: ["global"],
  requiresApiKey: true,
  free: false,
};

/** CASIA-WebFace — 500k face images of 10,575 subjects (research-use license). */
export const casiaWebFace: DataSourceConfig = {
  id: "casia-webface",
  name: "CASIA-WebFace Dataset",
  category: "public_api",
  description:
    "CASIA-WebFace — 494,414 face images of 10,575 subjects harvested from the web, the standard pre-MegFace academic benchmark. Released by CASIA for research use; commercial deployment requires a separate agreement.",
  urls: { download: "https://sites.google.com/site/xiaoboacer/", docs: "http://vis-www.cs.umass.edu/lfw/" },
  trustScore: 75,
  format: "dump",
  updateFrequency: "yearly",
  integrationMethod: "dump_download",
  capabilities: ["face-recognition", "face-matching", "embedding-pretraining", "subject-disambiguation"],
  coverage: ["global"],
  requiresApiKey: true,
  free: false,
};

/** InsightFace datasets — Buffalo / Glint360k / WebFace600K reference corpora. */
export const insightFace: DataSourceConfig = {
  id: "insightface-datasets",
  name: "InsightFace Reference Datasets & Model Zoo",
  category: "partner_api",
  description:
    "InsightFace project's curated reference datasets (Glint360k, WebFace600K) and pre-trained model zoo (Buffalo, AntelopeV2) — the de-facto open face-recognition stack. Each underlying dataset carries its own license; the Brain only loads datasets for which Circle has a valid agreement.",
  urls: { download: "https://github.com/deepinsight/insightface", docs: "https://insightface.ai/" },
  trustScore: 85,
  format: "dump",
  updateFrequency: "yearly",
  integrationMethod: "dump_download",
  capabilities: ["face-detection", "face-recognition", "liveness-detection", "face-matching", "embedding-pretraining", "arcface-pretraining"],
  coverage: ["global"],
  requiresApiKey: true,
  free: false,
};

/** All face-recognition sources, in descending trust order. Circle Verify ONLY. */
export const faceRecognitionSources: DataSourceConfig[] = [
  vggFace2, insightFace, ms1m, casiaWebFace,
];

export default faceRecognitionSources;

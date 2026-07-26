import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { defineConformanceSuite } from "../../contracts/conformance/suite.mjs";
import { hrMoneyFixture } from "./fixtures/hr-money.fixture.mjs";

defineConformanceSuite([hrMoneyFixture], { describe, it, expect, beforeAll, afterAll });

import { fakeResourceServices } from '#test/support/resource-services.ts';

/** One in-memory resource table shared by every mocked module in a test file. */
export const fake = fakeResourceServices();

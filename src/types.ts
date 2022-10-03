import Page from './page';

export type Locals = Record<string, any>;

export type GenerateOptions = ({
  source: string,
} | {
  source: Page
} | {
  source: Page[]
}) & {
  locals?: Locals,
  paginate?: number,
  dest: string
};

export type GeneratedPage = Record<string, any>;
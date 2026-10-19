import type { SiteRecipe } from './recipe-types';

/**
 * Exact selectors for the big ATSs. Anything a recipe does not cover (custom questions, links)
 * still goes through generic label matching and AI, so a recipe only has to be right, not complete.
 */
const SMART_RECRUITERS: SiteRecipe = {
  name: 'SmartRecruiters',
  hostPattern: /(^|\.)smartrecruiters\.com$/,
  markerSelector: 'spl-input, spl-dropzone, oc-button',
  // Their resume parser refills name and email a moment after upload.
  resumeParseWaitMilliseconds: 2500,
  fields: [
    {
      profileKey: 'resume',
      kind: 'resume',
      selectors: [
        'spl-dropzone[data-test="resume-upload"] >>> input[type="file"]',
        '[data-test="resume-upload-container"] input[type="file"]',
      ],
    },
    { profileKey: 'firstName', kind: 'text', selectors: ['spl-input >>> input#first-name-input'] },
    { profileKey: 'lastName', kind: 'text', selectors: ['spl-input >>> input#last-name-input'] },
    { profileKey: 'email', kind: 'text', selectors: ['spl-input >>> input#email-input'] },
    { profileKey: 'email', kind: 'text', selectors: ['spl-input >>> input#confirm-email-input'] },
    {
      profileKey: 'location',
      kind: 'autocomplete',
      selectors: ['spl-autocomplete >>> input[type="text"]', 'spl-autocomplete >>> input'],
      optionScope: 'spl-autocomplete',
      optionSelector: 'spl-select-option',
    },
    {
      profileKey: 'country',
      kind: 'choice',
      selectors: ['spl-phone-field >>> spl-select'],
      optionScope: 'spl-phone-field',
      optionSelector: 'spl-select-option',
    },
    {
      profileKey: 'linkedin',
      kind: 'text',
      selectors: ['spl-input[label="LinkedIn"] >>> input', 'input#linkedin-input'],
    },
    { profileKey: 'portfolio', kind: 'text', selectors: ['spl-input[label="Website"] >>> input'] },
  ],
  successSelectors: ['[data-test="success-page-confirmation"]'],
};

const GREENHOUSE: SiteRecipe = {
  name: 'Greenhouse',
  hostPattern: /(^|\.)greenhouse\.io$/,
  markerSelector: '#application_form, form#application-form, [class*="application--form"]',
  fields: [
    {
      profileKey: 'resume',
      kind: 'resume',
      selectors: ['input#resume[type="file"]', 'input[type="file"][id*="resume"]'],
    },
    { profileKey: 'firstName', kind: 'text', selectors: ['input#first_name'] },
    { profileKey: 'lastName', kind: 'text', selectors: ['input#last_name'] },
    { profileKey: 'email', kind: 'text', selectors: ['input#email'] },
    { profileKey: 'phone', kind: 'text', selectors: ['input#phone'] },
    {
      profileKey: 'location',
      kind: 'autocomplete',
      selectors: ['input#candidate-location', 'input#job_application_location'],
      optionSelector: '[role="option"], [class*="select__option"]',
    },
  ],
  successSelectors: ['#application_confirmation', '[class*="confirmation"] h1', '.application-confirmation'],
};

const LEVER: SiteRecipe = {
  name: 'Lever',
  hostPattern: /(^|\.)lever\.co$/,
  markerSelector: 'form#application-form .application-question',
  // Lever reads the resume and fills name, email and phone itself.
  resumeParseWaitMilliseconds: 2000,
  fields: [
    { profileKey: 'resume', kind: 'resume', selectors: ['input#resume-upload-input', 'input[name="resume"]'] },
    { profileKey: 'name', kind: 'text', selectors: ['input[name="name"]'] },
    { profileKey: 'email', kind: 'text', selectors: ['input[name="email"]'] },
    { profileKey: 'phone', kind: 'text', selectors: ['input[name="phone"]'] },
    {
      profileKey: 'location',
      kind: 'autocomplete',
      selectors: ['input[name="location"]', 'input#location-input'],
      optionSelector: '.dropdown-location, .dropdown-results > div',
    },
    { profileKey: 'currentCompany', kind: 'text', selectors: ['input[name="org"]'] },
    { profileKey: 'linkedin', kind: 'text', selectors: ['input[name="urls[LinkedIn]"]'] },
    { profileKey: 'github', kind: 'text', selectors: ['input[name="urls[GitHub]"]'] },
    {
      profileKey: 'portfolio',
      kind: 'text',
      selectors: ['input[name="urls[Portfolio]"]', 'input[name="urls[Other]"]'],
    },
  ],
  successSelectors: ['.application-confirmation', '[data-qa="msg-submit-success"]'],
};

const ASHBY: SiteRecipe = {
  name: 'Ashby',
  hostPattern: /(^|\.)ashbyhq\.com$/,
  markerSelector: '#_systemfield_name, #_systemfield_email',
  resumeParseWaitMilliseconds: 2500,
  fields: [
    {
      profileKey: 'resume',
      kind: 'resume',
      selectors: ['input#_systemfield_resume', 'input[type="file"][id*="resume"]'],
    },
    { profileKey: 'name', kind: 'text', selectors: ['input#_systemfield_name'] },
    { profileKey: 'email', kind: 'text', selectors: ['input#_systemfield_email'] },
    { profileKey: 'phone', kind: 'text', selectors: ['input#_systemfield_phone', 'input[type="tel"]'] },
    {
      profileKey: 'location',
      kind: 'autocomplete',
      selectors: ['input#_systemfield_location', 'input[placeholder*="Start typing" i]'],
      optionSelector: '[role="option"]',
    },
  ],
  successSelectors: ['[class*="ashby-application-form-success"]', '[data-testid="application-success"]'],
};

const WORKABLE: SiteRecipe = {
  name: 'Workable',
  hostPattern: /(^|\.)workable\.com$/,
  markerSelector: 'form[data-ui="application-form"]',
  resumeParseWaitMilliseconds: 2000,
  fields: [
    {
      profileKey: 'resume',
      kind: 'resume',
      selectors: ['[data-ui="resume"] input[type="file"]', 'input[name="resume"]'],
    },
    { profileKey: 'firstName', kind: 'text', selectors: ['input[name="firstname"]'] },
    { profileKey: 'lastName', kind: 'text', selectors: ['input[name="lastname"]'] },
    { profileKey: 'email', kind: 'text', selectors: ['input[name="email"]'] },
    { profileKey: 'phone', kind: 'text', selectors: ['input[name="phone"]'] },
    {
      profileKey: 'location',
      kind: 'autocomplete',
      selectors: ['input[name="address"]', 'input[data-ui="address"]'],
      optionSelector: '[role="option"]',
    },
  ],
  successSelectors: ['[data-ui="application-success"]', '[data-ui="success-message"]'],
};

export const SITE_RECIPES: SiteRecipe[] = [SMART_RECRUITERS, GREENHOUSE, LEVER, ASHBY, WORKABLE];

/** This page's recipe: by host, or by a marker element for ATSs embedded on company domains. */
export function findSiteRecipe(pageDocument: Document = document): SiteRecipe | undefined {
  const hostname = pageDocument.location?.hostname ?? '';
  return (
    SITE_RECIPES.find((recipe) => recipe.hostPattern.test(hostname)) ??
    SITE_RECIPES.find((recipe) => recipe.markerSelector && pageDocument.querySelector(recipe.markerSelector))
  );
}

import type { DesignScheme } from '~/types/design-scheme';
import { stripCommonIndent } from './promptSections';

/** Builds the visual design guidance included in the system prompt. */
export const getDesignInstructions = (designScheme?: DesignScheme): string =>
  stripCommonIndent(`
  <design_instructions>
    Overall Goal: Create visually stunning, unique, highly interactive, content-rich, and production-ready applications. Avoid generic templates.

    Visual Identity & Branding:
      - Establish a distinctive art direction (unique shapes, grids, illustrations).
      - Use premium typography with refined hierarchy and spacing.
      - Incorporate microbranding (custom icons, buttons, animations) aligned with the brand voice.
      - Use high-quality, optimized visual assets (photos, illustrations, icons).
      - IMPORTANT: Unless specified by the user, Octotask ALWAYS uses stock photos from Pexels where appropriate, only valid URLs you know exist. Octotask NEVER downloads the images and only links to them in image tags.

    Layout & Structure:
      - Implement a systemized spacing/sizing system (e.g., 8pt grid, design tokens).
      - Use fluid, responsive grids (CSS Grid, Flexbox) adapting gracefully to all screen sizes (mobile-first).
      - Employ atomic design principles for components (atoms, molecules, organisms).
      - Utilize whitespace effectively for focus and balance.

    User Experience (UX) & Interaction:
      - Design intuitive navigation and map user journeys.
      - Implement smooth, accessible microinteractions and animations (hover states, feedback, transitions) that enhance, not distract.
      - Use predictive patterns (pre-loads, skeleton loaders) and optimize for touch targets on mobile.
      - Ensure engaging copywriting and clear data visualization if applicable.

    Color & Typography:
      - Color system with a primary, secondary and accent, plus success, warning, and error states.
      - Smooth animations for task interactions.
      - Modern, readable fonts.
      - Intuitive task cards, clean lists, and easy navigation.
      - Responsive design with tailored layouts for mobile (<768px), tablet (768-1024px), and desktop (>1024px).
      - Subtle shadows and rounded corners for a polished look.

    Technical Excellence:
      - Write clean, semantic HTML with ARIA attributes for accessibility (aim for WCAG AA/AAA).
      - Ensure consistency in design language and interactions throughout.
      - Pay meticulous attention to detail and polish.
      - Always prioritize user needs and iterate based on feedback.

    <user_provided_design>
      USER PROVIDED DESIGN SCHEME:
      - ALWAYS use the user provided design scheme when creating designs ensuring it complies with the professionalism of design instructions below, unless the user specifically requests otherwise.
      FONT: ${JSON.stringify(designScheme?.font)}
      COLOR PALETTE: ${JSON.stringify(designScheme?.palette)}
      FEATURES: ${JSON.stringify(designScheme?.features)}
    </user_provided_design>
  </design_instructions>
`);

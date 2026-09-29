'use client';

// The frontdesk portal shares the same sidebar/navbar as the helpdesk portal.
// This layout simply re-exports the helpdesk layout so that pages under
// /frontdesk/* get the correct sidebar and navbar.
export { default } from '../helpdesk/layout';

import type { ContenedoresDict } from './contenedores.dict';

export const contenedoresEn: ContenedoresDict = {
  list: {
    title: 'Your companies',
    subtitle: 'Pick a workspace to continue',
    newButton: 'New company',
    searchPlaceholder: 'Search...',
    enter: 'Enter',
    status: { active: 'Active', inactive: 'Inactive' },
    summary: {
      containers: { one: 'container', other: 'containers' },
      active: { one: 'active', other: 'active' },
    },
    actions: {
      menuLabel: 'Container options',
      invite: 'Invite user',
      edit: 'Edit container',
      updateSubscription: 'Update subscription',
      delete: 'Delete container',
    },
    view: {
      list: 'List view',
      grid: 'Grid view',
    },
    empty: {
      noResults: {
        title: 'No results',
        sub: 'No companies match your search.',
      },
      noContenedores: {
        title: 'No companies',
        sub: 'You do not have any workspaces assigned yet.',
        cta: 'Create first company',
      },
    },
    expired: {
      badge: 'Expired',
      ownerCta: 'Renew subscription',
      memberLocked: 'Only the owner can renew',
    },
    roles: {
      propietario: 'Owner',
      miembro: 'Member',
    },
  },
  create: {
    title: 'New company',
    subtitle: 'Configure the new workspace',
    fields: {
      name: 'Company name',
      namePlaceholder: 'Acme Corp',
      phone: 'Phone',
      phonePlaceholder: '3153334455',
      email: 'Email',
      emailPlaceholder: 'contact@company.com',
    },
    validation: {
      nameRequired: 'Name is required.',
      nameMin2: 'Minimum 2 characters.',
      phoneRequired: 'Phone is required.',
      phoneMax20: 'Maximum 20 characters.',
      emailRequired: 'Email is required.',
      emailInvalid: 'Enter a valid email.',
    },
    submit: 'Create company',
    cancel: 'Cancel',
    toasts: {
      success: { title: 'Company created', desc: 'The container was created successfully.' },
      error: { title: 'Creation error', desc: 'Could not create the container. Try again.' },
    },
  },
  edit: {
    title: 'Edit container',
    subtitle: 'Update the container details',
    submit: 'Save changes',
    cancel: 'Cancel',
    toasts: {
      success: { title: 'Company updated', desc: 'Changes were saved successfully.' },
      error: { title: 'Update error', desc: 'Could not update the company. Try again.' },
    },
  },
  delete: {
    title: 'Delete container',
    subtitle: 'This action is permanent and cannot be undone.',
    warning: 'All data associated with this container will be permanently deleted.',
    containerLabel: 'Container to delete',
    confirmLabel: 'To confirm, type the exact name of the container',
    confirmError: 'The name does not match.',
    submit: 'Delete',
    cancel: 'Cancel',
    toasts: {
      success: { title: 'Container deleted', desc: 'The container was deleted successfully.' },
      error: { title: 'Deletion error', desc: 'Could not delete the container. Try again.' },
    },
  },
  invite: {
    title: 'Invite to container',
    subtitle: 'Share this workspace with your team by email.',
    tabs: { members: 'Members', pending: 'Invitations' },
    form: {
      label: 'Invitee email',
      placeholder: 'name@company.com',
      invalid: 'Enter a valid email.',
      submit: 'Send invitation',
      sending: 'Sending…',
      grupos: {
        label: 'Groups',
        placeholder: 'Select groups (optional)',
        empty: 'No groups available.',
      },
    },
    pending: {
      estados: { P: 'Pending', A: 'Accepted', R: 'Rejected' },
      count: { one: 'invitation', other: 'invitations' },
      empty: {
        title: 'No invitations',
        sub: 'Invitations you send will appear here.',
      },
      toasts: {
        loadError: {
          title: 'Failed to load invitations',
          desc: 'We could not fetch the pending invitations.',
        },
      },
    },
    members: {
      title: 'Members',
      count: { one: 'member', other: 'members' },
      empty: {
        title: 'No one else yet',
        sub: 'Invite someone by email and they will appear here.',
      },
      you: 'you',
      roles: {
        propietario: 'Owner',
        miembro: 'Member',
      },
      removeAria: 'Remove member',
    },
    remove: {
      title: 'Remove member',
      desc: 'They will lose access to the container. This cannot be undone.',
      confirm: 'Remove',
      cancel: 'Cancel',
    },
    close: 'Close',
    toasts: {
      sent: {
        title: 'Invitation sent',
        desc: 'We emailed them to join the container.',
      },
      sendError: {
        title: 'Could not invite',
        desc: 'Try again in a moment.',
      },
      removed: {
        title: 'Member removed',
        desc: 'They no longer have access to the container.',
      },
      removeError: {
        title: 'Could not remove',
        desc: 'Try again in a moment.',
      },
      loadError: {
        title: 'Failed to load members',
        desc: 'We could not fetch the member list.',
      },
    },
  },
};

(() => {
  'use strict';

  const config = window.SHELTER_CONFIG || {};
  const find = (selector, context = document) => context.querySelector(selector);
  const findAll = (selector, context = document) => Array.from(context.querySelectorAll(selector));
  const rupees = new Intl.NumberFormat('en-IN', {
    style: 'currency', currency: 'INR', maximumFractionDigits: 0,
  });

  // Keep public contact links and labels in sync with the editable configuration.
  const publicPhone = String(config.phone || '+918618225779').trim();
  const phoneNumber = `${publicPhone.startsWith('+') ? '+' : ''}${publicPhone.replace(/\D/g, '')}`;
  const publicEmail = String(config.email || 'g9balaji@gmail.com').trim();
  const whatsappNumber = String(config.whatsapp || '918618225779').replace(/\D/g, '');
  const phoneLabel = /^\+91\d{10}$/.test(phoneNumber)
    ? `+91 ${phoneNumber.slice(3, 8)} ${phoneNumber.slice(8)}` : publicPhone;

  findAll('[data-contact-phone-text]').forEach((element) => { element.textContent = phoneLabel; });
  findAll('[data-contact-email-text]').forEach((element) => { element.textContent = publicEmail; });
  if (typeof config.legalName === 'string' && config.legalName.trim()) {
    findAll('[data-legal-name]').forEach((element) => { element.textContent = config.legalName; });
  }
  findAll('a[href^="tel:"], a[href^="mailto:"], a[href^="https://wa.me/"]').forEach((link) => {
    const current = new URL(link.href);
    const parameters = `${current.search}${current.hash}`;
    if (current.protocol === 'tel:') link.href = `tel:${phoneNumber}${parameters}`;
    else if (current.protocol === 'mailto:') link.href = `mailto:${encodeURIComponent(publicEmail)}${parameters}`;
    else link.href = `https://wa.me/${whatsappNumber}${parameters}`;
  });

  const setPressed = (buttons, active) => {
    buttons.forEach((button) => {
      const selected = button === active;
      button.setAttribute('aria-pressed', String(selected));
      button.classList.toggle('is-active', selected);
    });
  };

  const openDialog = (dialog) => {
    if (!dialog || dialog.open) return;
    if (typeof dialog.showModal === 'function') dialog.showModal();
    else dialog.setAttribute('open', '');
  };

  const closeDialog = (dialog) => {
    if (!dialog) return;
    if (typeof dialog.close === 'function') dialog.close();
    else {
      dialog.removeAttribute('open');
      dialog.dispatchEvent(new Event('close'));
    }
  };

  findAll('[data-close-dialog]').forEach((button) => {
    button.addEventListener('click', () => closeDialog(button.closest('dialog')));
  });

  findAll('dialog').forEach((dialog) => {
    let startedOnBackdrop = false;
    dialog.addEventListener('pointerdown', (event) => {
      const rect = dialog.getBoundingClientRect();
      startedOnBackdrop = event.target === dialog &&
        (event.clientX < rect.left || event.clientX > rect.right ||
         event.clientY < rect.top || event.clientY > rect.bottom);
    });
    dialog.addEventListener('click', (event) => {
      if (!startedOnBackdrop || event.target !== dialog) return;
      const rect = dialog.getBoundingClientRect();
      if (event.clientX < rect.left || event.clientX > rect.right ||
          event.clientY < rect.top || event.clientY > rect.bottom) closeDialog(dialog);
      startedOnBackdrop = false;
    });
  });

  findAll('[data-open-dialog]').forEach((button) => {
    button.addEventListener('click', (event) => {
      const id = button.dataset.openDialog.replace(/^#/, '');
      const dialog = document.getElementById(id);
      if (!dialog) return;
      event.preventDefault();
      openDialog(dialog);
    });
  });

  const privacyLink = find('#privacy-link');
  if (privacyLink && !privacyLink.hasAttribute('data-open-dialog')) {
    privacyLink.addEventListener('click', (event) => {
      const dialog = find('#privacy-dialog');
      if (!dialog) return;
      event.preventDefault();
      openDialog(dialog);
    });
  }

  // Mobile navigation remains regular links when JavaScript is unavailable.
  const menuToggle = find('#menu-toggle');
  const navigation = find('#site-nav');
  const setMenu = (open) => {
    if (!menuToggle || !navigation) return;
    menuToggle.setAttribute('aria-expanded', String(open));
    menuToggle.setAttribute('aria-label', open ? 'Close navigation menu' : 'Open navigation menu');
    navigation.classList.toggle('is-open', open);
    menuToggle.classList.toggle('is-open', open);
  };
  if (menuToggle && navigation) {
    menuToggle.addEventListener('click', () => {
      setMenu(menuToggle.getAttribute('aria-expanded') !== 'true');
    });
    findAll('a', navigation).forEach((link) => link.addEventListener('click', () => setMenu(false)));
    document.addEventListener('click', (event) => {
      if (!navigation.contains(event.target) && !menuToggle.contains(event.target)) setMenu(false);
    });
    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && menuToggle.getAttribute('aria-expanded') === 'true') {
        setMenu(false);
        menuToggle.focus();
      }
    });
  }

  // Selecting an amount creates an inquiry only; there is no charge or subscription.
  const donationForm = find('#donation-form');
  const amountButtons = findAll('[data-amount]');
  if (Array.isArray(config.suggestedAmounts) &&
      config.suggestedAmounts.length === amountButtons.length &&
      config.suggestedAmounts.every((amount) => Number.isSafeInteger(amount) && amount > 0 && amount <= 10000000)) {
    amountButtons.forEach((button, index) => {
      const amount = config.suggestedAmounts[index];
      button.dataset.amount = String(amount);
      button.textContent = rupees.format(amount);
    });
  }
  const frequencyButtons = findAll('[data-frequency]');
  const customAmount = find('#custom-amount');
  const purposeSelect = find('#donation-purpose');
  const donationError = find('#donation-error');
  const donationDialog = find('#donation-dialog');
  let selectedAmount = Number(config.defaultAmount) || 1100;
  if (amountButtons.length && !amountButtons.some((button) => Number(button.dataset.amount) === selectedAmount)) {
    selectedAmount = Number(amountButtons[0].dataset.amount);
  }
  let selectedFrequency = 'once';

  const clearDonationError = () => {
    if (donationError) donationError.textContent = '';
    if (customAmount) customAmount.removeAttribute('aria-invalid');
  };

  const defaultAmountButton = amountButtons.find((button) => Number(button.dataset.amount) === selectedAmount);
  setPressed(amountButtons, defaultAmountButton);
  setPressed(frequencyButtons, frequencyButtons.find((button) => button.dataset.frequency === 'once'));

  amountButtons.forEach((button) => {
    button.addEventListener('click', () => {
      selectedAmount = Number(button.dataset.amount);
      if (customAmount) customAmount.value = '';
      setPressed(amountButtons, button);
      clearDonationError();
    });
  });

  frequencyButtons.forEach((button) => {
    button.addEventListener('click', () => {
      selectedFrequency = button.dataset.frequency === 'monthly' ? 'monthly' : 'once';
      setPressed(frequencyButtons, button);
      const frequencyInput = find('#donation-frequency');
      if (frequencyInput) frequencyInput.value = selectedFrequency;
    });
  });

  if (customAmount) {
    customAmount.addEventListener('input', () => {
      clearDonationError();
      setPressed(amountButtons, customAmount.value.trim() === ''
        ? amountButtons.find((button) => Number(button.dataset.amount) === selectedAmount)
        : null);
    });
  }

  findAll('[data-select-purpose]').forEach((button) => {
    button.addEventListener('click', () => {
      if (!purposeSelect) return;
      const requested = button.dataset.selectPurpose;
      const option = Array.from(purposeSelect.options).find((item) =>
        item.value === requested || item.textContent.trim() === requested);
      if (option) purposeSelect.value = option.value;
    });
  });

  if (donationForm) {
    donationForm.noValidate = true;
    donationForm.addEventListener('submit', (event) => {
      event.preventDefault();
      clearDonationError();
      const rawCustom = customAmount ? customAmount.value.trim() : '';
      const hasBadInput = Boolean(customAmount && customAmount.validity.badInput);
      const amount = rawCustom === '' ? selectedAmount : Number(rawCustom);
      if (hasBadInput || !Number.isSafeInteger(amount) || amount < 1 || amount > 10000000) {
        if (donationError) donationError.textContent = 'Please enter a whole-rupee amount between ₹1 and ₹1,00,00,000.';
        if (customAmount) {
          customAmount.setAttribute('aria-invalid', 'true');
          customAmount.focus();
        }
        return;
      }

      const purpose = purposeSelect && purposeSelect.selectedOptions.length
        ? purposeSelect.selectedOptions[0].textContent.trim() : 'Where needed most';
      const formattedAmount = rupees.format(amount);
      const monthly = selectedFrequency === 'monthly';
      const contribution = monthly ? `monthly support of ${formattedAmount}` : `a one-time contribution of ${formattedAmount}`;
      const summary = find('#donation-summary');
      if (summary) summary.textContent = `${formattedAmount} · ${monthly ? 'Monthly support interest' : 'One-time contribution'} · ${purpose}`;

      const message = [
        `Hello ${config.displayName || 'Sri Mahagowri Charitable Trust'},`,
        '',
        `I would like to enquire about ${contribution} for the cow shelter.`,
        `Purpose: ${purpose}.`,
        '',
        'Please share your verified payment details and information about a donation receipt.',
        '',
        'This is a donation inquiry only. No payment has been made and no automatic recurring payment is being authorized.',
      ].join('\n');

      const messageField = find('#donation-message');
      if (messageField) messageField.value = message;
      const whatsappLink = find('#donation-whatsapp');
      if (whatsappLink) {
        whatsappLink.href = `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(message)}`;
      }
      const emailLink = find('#donation-email');
      if (emailLink) {
        const subject = `${monthly ? 'Monthly support inquiry' : 'Donation inquiry'} — Cow shelter`;
        emailLink.href = `mailto:${encodeURIComponent(publicEmail)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(message)}`;
      }
      const copyStatus = find('#copy-status');
      if (copyStatus) copyStatus.textContent = '';
      openDialog(donationDialog);
    });
  }

  const copyText = async (text, status, fallbackInput) => {
    try {
      if (!navigator.clipboard || !navigator.clipboard.writeText) throw new Error('Clipboard unavailable');
      await navigator.clipboard.writeText(text);
      if (status) status.textContent = 'Copied. You can paste it into your message.';
    } catch (_error) {
      if (fallbackInput) {
        fallbackInput.focus();
        fallbackInput.select();
        if (status) status.textContent = 'The message is selected. Copy it using your device’s copy command.';
      } else if (status) {
        status.textContent = `Please copy this number: ${text}`;
      }
    }
  };

  const copyRequest = find('#copy-request');
  if (copyRequest) copyRequest.addEventListener('click', () => {
    const field = find('#donation-message');
    if (field) copyText(field.value, find('#copy-status'), field);
  });

  findAll('[data-copy-phone]').forEach((button) => button.addEventListener('click', () => {
    copyText(publicPhone, find('#contact-copy-status'));
  }));

  // The gallery uses only supplied shelter photographs.
  const galleryButtons = findAll('[data-gallery]');
  const galleryFilters = findAll('[data-gallery-filter]');
  const galleryDialog = find('#gallery-dialog');
  let activeGalleryButton = null;
  setPressed(galleryFilters, galleryFilters.find((button) => button.dataset.galleryFilter === 'all'));
  const galleryCard = (button) => button.closest('.gallery-item') || button;
  const visibleGalleryButtons = () => galleryButtons.filter((button) => !galleryCard(button).hidden);

  const showPhoto = (button) => {
    if (!button) return;
    activeGalleryButton = button;
    const largeImage = find('#gallery-large-image');
    const sourceImage = find('img', button);
    const caption = button.dataset.caption || (sourceImage ? sourceImage.alt : 'At the cow shelter');
    if (largeImage) {
      largeImage.src = button.dataset.full || (sourceImage ? sourceImage.src : '');
      largeImage.alt = button.dataset.alt || (sourceImage ? sourceImage.alt : caption);
    }
    const captionElement = find('#gallery-caption');
    if (captionElement) captionElement.textContent = caption;
    const visible = visibleGalleryButtons();
    const position = find('#gallery-position');
    if (position) position.textContent = `${visible.indexOf(button) + 1} of ${visible.length}`;
    const previous = find('#gallery-prev');
    const next = find('#gallery-next');
    if (previous) previous.disabled = visible.length < 2;
    if (next) next.disabled = visible.length < 2;
  };

  galleryButtons.forEach((button) => button.addEventListener('click', (event) => {
    if (!galleryDialog) return;
    event.preventDefault();
    showPhoto(button);
    openDialog(galleryDialog);
  }));

  const movePhoto = (direction) => {
    const visible = visibleGalleryButtons();
    if (!visible.length) return;
    const current = visible.indexOf(activeGalleryButton);
    showPhoto(visible[(current + direction + visible.length) % visible.length]);
  };
  const galleryPrevious = find('#gallery-prev');
  const galleryNext = find('#gallery-next');
  if (galleryPrevious) galleryPrevious.addEventListener('click', () => movePhoto(-1));
  if (galleryNext) galleryNext.addEventListener('click', () => movePhoto(1));
  if (galleryDialog) galleryDialog.addEventListener('keydown', (event) => {
    if (!galleryDialog.open) return;
    if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
      event.preventDefault();
      movePhoto(event.key === 'ArrowLeft' ? -1 : 1);
    }
  });

  galleryFilters.forEach((button) => button.addEventListener('click', () => {
    const category = button.dataset.galleryFilter;
    setPressed(galleryFilters, button);
    galleryButtons.forEach((photo) => {
      galleryCard(photo).hidden = category !== 'all' && photo.dataset.category !== category;
    });
    if (galleryDialog && galleryDialog.open && activeGalleryButton && galleryCard(activeGalleryButton).hidden) {
      showPhoto(visibleGalleryButtons()[0]);
    }
  }));

  const watchVideo = find('#watch-video');
  const videoDialog = find('#video-dialog');
  const shelterVideo = find('#shelter-video');
  if (watchVideo && videoDialog && !watchVideo.hasAttribute('data-open-dialog')) {
    watchVideo.addEventListener('click', (event) => {
      event.preventDefault();
      openDialog(videoDialog);
    });
  }
  if (videoDialog && shelterVideo) videoDialog.addEventListener('close', () => shelterVideo.pause());

  findAll('[data-current-year]').forEach((element) => { element.textContent = String(new Date().getFullYear()); });
  if (Number.isInteger(config.cowCount)) {
    findAll('[data-cow-count]').forEach((element) => { element.textContent = String(config.cowCount); });
  }
  document.documentElement.classList.add('js-ready');
})();

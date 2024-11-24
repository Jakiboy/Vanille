(function ($) {

	"use strict";

	// Define namespace
	var VanillePlugin = {};

	// Override plugin
	VanillePlugin.override = function (plugin) {

		const timeout = plugin.timeout || 0;
		plugin.timeout = parseInt(timeout) * 1000;

		const restful = plugin.restful || 0;
		plugin.restful = (parseInt(restful) === 1) ? true : false;

		// Extend plugin
		plugin = $.extend({
			baseUrl: '/',
			ajaxUrl: '/',
			restUrl: '/',
			namespace: false,
			name: false,
			language: false,
			inputs: {},
			strings: {},
			urls: {},
			overrided: true
		}, plugin);

		return plugin;
	}

	// Initialize plugin
	VanillePlugin.init = function (plugin, options) {

		const self = this;

		// Define global options
		self.reloading = false;

		// Overrided plugin
		if (!plugin.overrided) {
			plugin = self.override(plugin);
		}

		// Extend options
		options = $.extend({
			color: '#000'
		}, options);

		// Override empty <a> behavior
		$('a[href="#"]').click(function (e) {
			e.preventDefault();
		});

		// Ajax request
		VanillePlugin.request = function (args) {

			// Extend args
			args = $.extend({
				type: 'POST',
				dataType: 'JSON',
				data: {},
				url: plugin.ajaxUrl,
				timeout: plugin.timeout,
				success: function (response) { },
				error: function (xhr, status, error) { },
				complete: function () { }
			}, args);

			// Send ajax
			$.ajax(args);

		};

		// Custom Ajax request
		VanillePlugin.doAjax = function (element, args) {

			// Set element
			const type = element?.prop('tagName');
			if (!type) return;

			// Extend args
			args = $.extend({
				data: {},
				action: false,
				nonce: false,
				files: false, // Array
				silent: false,
				loading: true,
				successCb: function () { },
				errorCb: function () { },
				completeCb: function () { }
			}, args);

			// Do loading
			if (args.loading) {
				self.loading(element);
			}

			// Set action
			let action = args.data.action || args.action;
			if (!action) {
				if (type == 'FORM') {
					action = element.find('input[name="action"]').val();

				} else {
					action = element.attr('data-action');
				}
			}

			// Push action
			args.data.action = self.applyNamesapce(action);

			// Set nonce
			let nonce = args.data.nonce || args.nonce;
			if (!nonce) {
				if (type == 'FORM') {
					nonce = element.find('input[name="nonce"]').val();

				} else {
					const parent = element.parent('div');
					const attr = 'data-nonce';
					nonce = parent.find(`[${attr}]`).attr(attr) || element.attr(attr);
				}
			}

			// Push nonce
			args.data.nonce = nonce;

			// Extend callbacks
			args = $.extend({
				success: function (response) {

					args.successCb(response);

					// Message
					const silent = response.content?.silent || args.silent;
					if (response.message && silent === false) {
						self.notify(response.message, response.status);
					}

					// Reload
					const reload = response.content?.reload || self.reloading;
					if (reload === true) {
						self.reload(1500);
					}

					// Redirect
					const redirect = response.content?.redirect || false;
					if (redirect === true) {
						redirect(response.content.redirect);
					}

				},
				error: function (xhr, status, error) {

					args.errorCb(error);

					if (args.silent === false) {
						self.notifyMore(plugin.strings.global.error, error, 'error', 3000);
					}

				},
				complete: function () {

					args.completeCb();
					self.unloading(element);

				}
			}, args);

			// Set files data
			if (args.files) {

				const files = args.files;

				// Init form data
				const fd = new FormData();

				// Add files to form
				files.forEach((file, i) => {
					fd.append(i, file);
				});

				// Add data to form
				$.each(args.data, function (key, value) {
					fd.append(key, value);
				});

				// Set files settings
				args.data = fd;
				args.processData = false;
				args.contentType = false;

			}

			// Send request
			self.request(args);
		}

		// Fetch API request
		VanillePlugin.fetch = async function (url, args) {
			try {
				const response = await fetch(url, args);
				return response;
			} catch (error) {
				throw error;
			}
		};

		// Custom fetch API request
		VanillePlugin.doFetch = function (element, args) {

			// Set element
			const type = element?.prop('tagName');
			if (!type) return;

			// Extend args
			args = $.extend({
				method: 'POST',
				headers: {},
				data: {},
				nonce: false,
				endpoint: false,
				root: `${plugin.namespace}/v1/`,
				timeout: plugin.timeout,
				silent: false,
				loading: true,
				successCb: function () { },
				errorCb: function () { },
				completeCb: function () { }
			}, args);

			// Do loading
			if (args.loading) {
				self.loading(element);
			}

			// Set nonce
			let nonce = args.data.nonce || args.nonce;
			if (!nonce) {
				if (type == 'FORM') {
					nonce = element.find('input[name="rest-token"]').val();

				} else {
					const parent = element.parent('div');
					const attr = 'data-token';
					nonce = parent.find(`[${attr}]`).attr(attr) || element.attr(attr);
				}
			}

			// Extend headers
			const headers = $.extend({
				'Content-Type': 'application/json',
				'X-WP-Nonce': nonce
			}, args.headers);

			// Set endpoint
			let endpoint = args.endpoint;
			if (!endpoint) {
				if (type == 'FORM') {
					endpoint = element.find('input[name="endpoint"]').val();

				} else {
					const parent = element.parent('div');
					const attr = 'data-endpoint';
					endpoint = parent.find(`[${attr}]`).attr(attr) || element.attr(attr);
				}
			}
			endpoint = endpoint || 'default';

			// Set url
			const url = `${plugin.restUrl}${args.root}${endpoint}`;

			// Fetch response
			self.fetch(url, {
				headers: headers,
				method: args.method,
				signal: AbortSignal.timeout(args.timeout),
				body: JSON.stringify(args.data)
			})
				.then(response => {

					if (!response.ok) {
						throw new Error(response.statusText);
					}
					return response.json();

				})
				.then(response => {

					args.successCb(response);

					// Message
					const silent = response.content?.silent || args.silent;
					if (response.message && silent === false) {
						self.notify(response.message, response.status);
					}

					// Reload
					const reload = response.content?.reload || self.reloading;
					if (reload === true) {
						self.reload(1500);
					}

					// Redirect
					const redirect = response.content?.redirect || false;
					if (redirect === true) {
						redirect(response.content.redirect);
					}

				})
				.catch(error => {

					args.errorCb(error.message);

					if (args.silent === false) {
						self.notifyMore(plugin.strings.global.error, error.message, 'error', 3000);
					}

				}).finally(() => {

					args.completeCb();
					self.unloading(element);

				});

		};

		// saveHooks
		VanillePlugin.saveHooks = function (group, form, args) {

			if (!plugin.hooks) return;

			const hooks = plugin.hooks[group] || {};
			if (self.isEmpty(hooks)) return;

			const data = {};
			$.each(hooks, function (key) {

				// Set element
				const element = form.find(`[name="${key}"]`);
				const tag = element?.prop('tagName');

				if (!tag || tag == 'BUTTON' || tag == 'p') {
					return;
				}

				if (element.length) {

					const type = element.attr('type') || 'text';
					const step = element.attr('step') || false;
					let val;

					if (tag == 'CHECKBOX') {
						val = self.toBool(element.is(':checked'));

					} else if (tag == 'INPUT' && type == 'number') {
						if (step !== false) {
							val = self.toFloat(element.val());

						} else {
							val = self.toInt(element.val());
						}

					} else {
						val = self.toStr(element.val());
					}

					const saved = self.toStr(hooks[key]);
					if (val !== saved) {
						data[group] = {};
						data[group][key] = val;
					}

				}

			});

			if (self.isEmpty(data)) return;

			// Extend args
			args = $.extend({
				action: 'save-hooks',
				endpoint: 'hooks',
				nonce: false,
				silent: true,
				loading: false
			}, args);

			// Set data
			args.data = { hooks: data };

			if (plugin.restful == true) {
				self.doFetch(form, args);

			} else {
				const nonce = form.find('input[name="hook-token"]').val();
				args.nonce = nonce;
				self.doAjax(form, args);
			}

		}

		// isLoading
		VanillePlugin.isLoading = function (element) {
			const type = element?.prop('tagName');
			if (!type) return;
			if (type == 'FORM') {
				return element.find('button[type="submit"]').hasClass('icon-loading');
			}
			return element.hasClass('icon-loading');
		}

		// unloading
		VanillePlugin.unloading = function (element) {

			const type = element?.prop('tagName');
			if (!type) return;

			if (type == 'FORM') {
				element.find('button[type="submit"]').removeClass('icon-loading');

			} else {
				element.removeClass('icon-loading');
			}

		}

		// loading
		VanillePlugin.loading = function (element) {

			const type = element?.prop('tagName');
			if (!type) return;

			if (type == 'FORM') {
				element.find('button[type="submit"]').addClass('icon-loading');

			} else {
				element.addClass('icon-loading');
			}

		}

		// popup
		VanillePlugin.popup = function (title, type, html) {

			title = title || '';
			html = html || '';
			type = type || 'success';

			if (!swal) {
				alert(title);
				return;
			}

			swal.fire({
				icon: type,
				title: title,
				html: html,
				heightAuto: false,
				confirmButtonColor: options.color,
				allowOutsideClick: false
			});

		}

		// popupMore
		VanillePlugin.popupMore = function (title, text, type) {
			const message = `${title}<br><small>${text}</small>`;
			self.popup(message, type);
		}

		// notify
		VanillePlugin.notify = function (message, type, timeout) {

			message = message || false;
			type = type || 'success';
			timeout = (timeout !== undefined) ? timeout : 5000;

			const selector = '.toast.--notification';
			const iconDefault = 'bi-check-circle';
			let icon = iconDefault;

			const body = $('body');
			let toast = $(selector);
			let p = toast.find('.toast-body p');
			let i = toast.find('.toast-body i');

			if (type == 'error') {
				icon = 'bi-x-circle';

			} else if (type == 'warning') {
				icon = 'bi-exclamation-circle';

			} else if (type == 'info') {
				icon = 'bi-question-circle';
			}

			if (!toast.length) {

				const config = {
					className: `toast --notification`,
					role: "alert",
					ariaLive: "assertive",
					ariaAtomic: "true",
					dataDelay: timeout
				};

				const button = {
					type: "button",
					className: "btn-close",
					dataDismiss: "toast",
					ariaLabel: "Close",
				};

				let output = `
                <div class="${config.className}" 
                    role="${config.role}" 
                    aria-live="${config.ariaLive}" 
                    aria-atomic="${config.ariaAtomic}" 
                    data-type="${type}" 
                    data-bs-delay="${config.dataDelay}">
                `;

				output += `
                <div class="toast-body">
                    <i class="bi ${icon}"></i>
                    <p>${message}</p>
                </div>
                `;

				output += `
                <button type="${button.type}" 
                    class="${button.className}" 
                    data-bs-dismiss="${button.dataDismiss}" 
                    aria-label="${button.ariaLabel}">
                </button>
                </div>
                `;

				body.find(selector).remove();
				body.append(output);

				toast = $(selector);
				p = toast.find('.toast-body p');
				i = toast.find('.toast-body i');

			} else {
				toast.attr('data-bs-delay', timeout);
				toast.attr('data-type', type);
				i.removeClass(iconDefault).addClass(icon);
				p.html(message);
			}

			if (timeout > 0) {
				setTimeout(() => {
					toast.removeClass('show');
					p.html('{}');
				}, timeout);
			}

			toast.find('.btn-close').on('click', function (e) {
				e.preventDefault();
				toast.removeClass('show');
				p.html('{}');
			});

			toast.addClass('show');
		}

		// notifyMore
		VanillePlugin.notifyMore = function (message, more, type, timeout) {
			message = `${message}<br><small>${more}</small>`;
			self.notify(message, type, timeout);
		}

		// confirm
		VanillePlugin.confirm = function (args) {

			// extend args
			args = $.extend({
				element: false,
				message: false,
				confirmCb: false,
				cancelCb: false
			}, args);

			const element = args.element;
			const message = args.content || 'Continue?';

			// default confirm callback
			const confirmCb = args.confirmCb || function () { };

			// default cancel callback
			const cancelCb = args.cancelCb || function () {
				if (element) {
					self.unloading(element);
				}
				return;
			};

			$.confirm({
				title: plugin.strings.global.confirmation,
				content: message,
				animation: 'none',
				buttons: {
					confirm: {
						text: plugin.strings.global.yes,
						btnClass: 'btn-primary',
						action: confirmCb
					},
					cancel: {
						text: plugin.strings.global.cancel,
						action: cancelCb
					}
				}
			});

		};

		// wait
		VanillePlugin.wait = async function (callback, timer) {
			await new Promise(resolve => setTimeout(resolve, timer));
			if (typeof callback === 'function') {
				callback();
			}
		}

		// parseInputs
		VanillePlugin.parseInputs = function (group, form) {

			if (!plugin.inputs) return;

			const inputs = plugin.inputs[group].values || {};
			if (self.isEmpty(inputs)) return;

			let data = {};
			$.each(inputs, function (input, args) {

				const type = args?.type + '[name="' + input + '"]';
				const element = form.find(type);
				let val;

				if (args?.format == 'bool') {
					val = self.toBool(element.is(':checked'));

				} else if (args?.format == 'int') {
					val = self.toInt(element.val());

				} else if (args?.format == 'float') {
					val = self.toFloat(element.val());

				} else {
					val = self.toStr(element.val());
				}

				data[input] = val;

			});

			return data;

		}

		// parseFiles
		VanillePlugin.parseFiles = function (element) {
			let files = [];
			const inputs = element.find('.file-upload input[type="file"]');
			if (inputs.length) {
				inputs.each(function () {
					const temp = $(this).prop('files');
					for (let i = 0; i < temp.length; i++) {
						files.push(temp[i]);
					}
				});
			}
			return files;
		}

		// toDate
		VanillePlugin.toDate = function (string) {

			const from = string.split('/');
			const to = new Date(from[2], from[1] - 1, from[0]);

			const d = ('0' + to.getDate()).slice(-2);
			const m = ('0' + (to.getMonth() + 1)).slice(-2);
			const y = to.getFullYear();

			return `${y}-${m}-${d}`;

		}

		// isValidUrl
		VanillePlugin.isValidUrl = function (url) {
			const pattern = /^(https?:)?\/\//i;
			return pattern.test(url);
		}

		// isProtocol
		VanillePlugin.isProtocol = function (url, protocol) {
			for (let i = 0; i < protocol.length; i++) {
				if (url.indexOf(protocol[i] + ':') !== -1) {
					return true;
				}
			}
			return false;
		}

		// capitalize
		VanillePlugin.capitalize = function (string) {
			return string.charAt(0).toUpperCase() + string.slice(1);
		}

		// toBool
		VanillePlugin.toBool = function (val) {
			return "bool|" + (val ? 1 : 0);
		}

		// toInt
		VanillePlugin.toInt = function (val) {
			return "int|" + parseInt(val);
		}

		// toFloat
		VanillePlugin.toFloat = function (val) {
			return "float|" + parseFloat(val);
		}

		// toStr
		VanillePlugin.toStr = function (val) {
			if (val === undefined || val === null) {
				val = '';
			}
			return val.toString();
		}

		// parseObject
		VanillePlugin.parseObject = function (obj) {
			let data = {};
			if (typeof obj === 'object') {
				$.each(obj, (item, i) => {
					const key = Object.keys(item)[0];
					data[key] = item[key];
				});
			}
			return data;
		}

		// isEmpty
		VanillePlugin.isEmpty = function (item) {
			if (typeof item === 'object') {
				return (Object.values(item).length === 0);
			}
			if (typeof item === 'array') {
				return (item.length === 0);
			}
			return (item === '');
		}

		// splitString
		VanillePlugin.splitString = function (string, max, end) {
			if (!typeof string === 'string') {
				return string;
			}
			end = end || '...';
			max = max || 0;
			const split = string.substring(0, max) + add;
			return (string.length > max) ? split : string
		}

		// stripString
		VanillePlugin.stripString = function (string) {
			if (!typeof string === 'string') {
				return string;
			}
			return string.replace(/<\/?[^>]+(>|$)/g, '');
		}

		// Copy clipboard (Legacy)
		VanillePlugin.copyClipboardLegacy = async function (text) {
			text = (text !== undefined) ? text : '';
			const t = $('<input>');
			$('body').append(t);
			t.val(text).select();
			if (document.execCommand('copy')) {
				self.notify(plugin.strings.shortcode.copied);
			}
			t.remove();
		}

		// Copy clipboard
		VanillePlugin.copyClipboard = async function (text) {
			if (navigator.clipboard) {
				try {
					await navigator.clipboard.writeText(text);
				} catch (err) { }

			} else {
				await self.copyClipboardLegacy(text);
			}
		}

		// Get string date
		VanillePlugin.getStringDate = function () {

			const today = new Date();
			const y = today.getFullYear();
			const m = today.getMonth() + 1;
			const d = today.getDate();
			const h = today.getHours();
			const mi = today.getMinutes();
			const s = today.getSeconds();
			return `${y}-${m}-${d}-${h}-${mi}-${s}`;

		}

		// Download blob file
		VanillePlugin.downloadFile = function (text, fileType, fileName) {

			const blob = new Blob([text], { type: fileType });
			const a = document.createElement('a');

			a.download = fileName;
			a.href = URL.createObjectURL(blob);
			a.dataset.downloadurl = [fileType, a.download, a.href].join(':');
			a.style.display = 'none';

			document.body.appendChild(a);
			a.click();
			document.body.removeChild(a);

			setTimeout(function () {
				URL.revokeObjectURL(a.href);
			}, 1000);
		}

		// Init code editor
		VanillePlugin.initCodeEditor = function (selector) {

			const textarea = document.querySelector(selector);
			if (!textarea) return;

			const instance = wp.CodeMirror;
			if (!instance) return;

			const mode = textarea.getAttribute('mode') || 'html';
			const editor = instance.fromTextArea(textarea, {
				lineNumbers: true,
				indentWithTabs: true,
				tabSize: 2,
				autoRefresh: true,
				autofocus: true,
				mode: mode,
				scrollbarStyle: 'simple'
			});

			editor.on('change', function () {
				textarea.value = editor.getValue();
			});

		}

		// Check duplication
		VanillePlugin.isDuplicated = function () {
			if (window.IsDuplicate()) {
				self.notify(plugin.strings.global.opened, 'warning', 10000);
			}
			return this;
		}

		// Check connection
		VanillePlugin.isConnected = function (online = true) {
			if (online) {
				self.online();
			}
			self.offline();
		}

		// Reload
		VanillePlugin.reload = function (time) {
			time = time || 1000;
			self.wait(() => {
				location.reload();
			}, time)
		}

		// Redirect
		VanillePlugin.redirect = function (url) {
			if (typeof url === 'string') {
				setTimeout(function () {
					window.location.href = url;
				}, 1000);
			}
		}

		// activate
		VanillePlugin.activate = function (form) {

			form.on('submit', function (e) {

				e.preventDefault();
				if (self.isLoading(form)) return;

				self.doAjax(form, {
					data: {
						activation: self.parseInputs('activation', form)
					},
					timeout: plugin.timeout * 10,
					success: function (response) {

						self.saveHooks('activation', form);
						self.toStorage('nav-tab', '#activation-tab', 10000);

						const title = response.message;
						const message = response.content.message;
						self.popupMore(title, message, response.status);

						if (response.content?.reload) {
							self.reload(1500);
						}

					},
					error: function (error) {

						const title = plugin.strings.activation.error;
						const message = plugin.strings.global.error;
						self.popupMore(title, message, 'error');

					}
				});
			});

		}

		// register
		VanillePlugin.register = function (form) {

			form.on('submit', function (e) {

				e.preventDefault();
				if (self.isLoading(form)) return;

				const files = self.parseFiles(form);
				if (!files.length) {
					self.unloading(form);
					self.notify(plugin.strings.upload.error, 'warning');
					return;
				}

				self.doAjax(form, {
					files: files,
					timeout: plugin.timeout * 10
				});

			});

		}

		// unregister
		VanillePlugin.unregister = function (selector) {
			const element = $(selector);
			element.on('click', function (e) {
				e.preventDefault();
				if (self.isLoading(element)) return;
				self.doAjax(element);
			});
		}

		// saveSettings
		VanillePlugin.saveSettings = function (form) {

			form.on('submit', function (e) {

				e.preventDefault();
				if (self.isLoading(form)) return;

				const args = {
					data: {
						settings: self.parseInputs('settings', form),
						advanced: self.parseInputs('advanced', form)
					},
					successCb: function (response) {
						self.saveHooks('settings', form);
						self.saveHooks('advanced', form);
					}
				};

				if (plugin.restful == true) {
					self.doFetch(form, args);

				} else {
					self.doAjax(form, args);
				}

			});

		}

		// purgeCache
		VanillePlugin.purgeCache = function (element) {

			element.on('click', function (e) {

				e.preventDefault();
				if (self.isLoading(element)) return;

				if (plugin.restful == true) {
					self.doFetch(element, {
						'method': 'DELETE'
					});

				} else {
					self.doAjax(element, {
						'method': 'DELETE'
					});
				}

			});

		}

		// initTooltip
		VanillePlugin.initTooltip = function (args) {

			args = $.extend({
				item: 'tooltip',
				theme: false,
				width: 400
			}, args);

			let item = args.item || 'tooltip';
			item = self.applyNamesapce(item);

			const parent = 'tooltipster-default';
			const theme = args.theme || [parent, `${item}-theme`];

			$(`.${item}:not(".tooltipstered")`).tooltipster({
				maxWidth: parseInt(args.width),
				theme: theme
			});

		}

		// initSwitch
		VanillePlugin.initSwitch = function (selector) {
			$(selector).switcher();
		}

		// onSwitchChange
		VanillePlugin.onSwitchChange = function (selector, callback) {
			$('body').delegate(selector, 'switcher-changed', callback);
		}

		// initColorPicker
		VanillePlugin.initColorPicker = function (selector, args) {

			// Extend args
			args = $.extend({
				initial: '',
				label: '',
				recent: false,
				custom: true,
				selectCb: function () {
					const target = this.element.attr('data-name');
					const color = this.color;
					this.element.css({
						backgroundColor: color,
						color: color
					});
					$(`input[name="${target}"]`).val(color);
				}
			}, args);

			// Init
			$(selector).colorPick({
				initialColor: args.initial,
				paletteLabel: args.label,
				allowRecent: args.recent,
				recentMax: 0,
				allowCustomColor: args.custom,
				onColorSelected: args.selectCb
			});

			// Reset
			$('[data-name="reset-color"]').click(function (e) {
				e.preventDefault();
				const group = $(this).parent('.form-group');
				group.find(selector).css('background', '#d8d8d8');
				group.find('.form-control').val('');
			});

		}

		// modal
		VanillePlugin.modal = function (selector, args) {

			// Dynamic selector
			if (!selector) {
				selector = '[data-modal]';
			}

			// Extend args
			args = $.extend({
				duration: 150,
				close: false
			}, args);

			const element = $(selector);
			element.on('click', function (e) {
				e.preventDefault();

				const target = $(this).attr('data-modal');
				if (!target) return;

				const modal = $(`.${target}-modal`);
				modal.modal({
					fadeDuration: args.duration,
					showClose: args.close,
					escapeClose: false,
					clickClose: false
				});

			});

		}

		// initUpload
		VanillePlugin.initUpload = function (selector) {

			// Init dynamic selector
			if (!selector) {
				selector = 'input[type="file"]';
			}

			// Check element
			const element = $(selector);
			if (element?.prop('tagName') !== 'INPUT') return;

			// Check parent
			const parent = element.parent('div');
			if (!parent.length) return;
			if (!parent.hasClass('file-upload')) {
				parent.addClass('file-upload');
			}

			// Check label
			const label = parent.find('label');
			if (!label.length) return;
			if (label.attr('for') !== element.attr('id')) {
				return;
			}

			// Set default args
			const args = {
				accept: '.txt',
				type: 'text',
				size: 1 * (1024 * 1024)
			};

			// Set accept
			if (!element.attr('accept')) {
				element.attr('accept', args.accept);
			}

			// Set type
			if (!element.attr('data-type')) {
				element.attr('data-type', args.type);
			}

			// Set required
			if (!element.attr('data-required')) {
				element.attr('data-required', 'false');
			}

			// Remove multiple
			element.removeAttr('multiple');

			// Set title
			const title = label.find('span')?.text() || label.text();
			element.attr('data-title', title);

			// Set form (optional)
			const form = element.parents('form');
			let button;
			if (form.length) {
				button = form.find('button[type="submit"]');
			}

			// Add file
			element.on('change', function (e) {
				e.preventDefault();

				// Set input
				const input = $(this);

				// Set file
				const file = e.target.files[0];
				if (!file) return;

				// Set response strings
				const strings = plugin.strings.upload;

				// Check file size
				if (file.size > args.size) {
					self.notify(strings.size, 'warning', 0);
					input.val('');
					return;
				}

				// Enable button
				const requried = input.attr('data-required');
				if (button && requried == 'true') {
					button.prop('disabled', false);
				}

				// Init required content
				const parent = input.parent('div');
				const label = parent.find('label');

				// Init optional content
				const icon = label.find('i');
				const span = label.find('span');
				const small = label.find('small');
				const link = label.find('a');
				const accept = input.attr('accept');
				const title = input.attr('data-title');

				// Set content
				parent.addClass('uploaded');
				if (span.length) {
					span.text(strings.added);
				} else {
					label.appendChild(`<span>${strings.added}</span>`)
				}

				if (icon.length) {
					icon.addClass('icon-check');
					icon.removeClass('icon-cloud-upload');
				}

				if (small.length) {
					small.text(`(${file.name})`);
				}

				if (link.length) {

					link.css('visibility', 'visible');

					// Remove file
					link.on('click', function (e) {
						e.preventDefault();

						// Disable button
						const requried = input.attr('data-required');
						if (button && requried == 'true') {
							button.prop('disabled', true);
						}

						// Reset content
						input.val('');
						parent.removeClass('uploaded');
						icon.removeClass('icon-check');
						icon.addClass('icon-cloud-upload');
						span.text(title);
						small.text(`(${accept})`);
						$(this).css('visibility', 'hidden');

					});

				}

			});

		}

		// openInNewTab
		VanillePlugin.openInNewTab = function (url) {
			window.open(url, '_blank');
			return;
		}

		// navigateTab
		VanillePlugin.navigateTab = function (element, link, ttl = 10000) {

			// Namespaced tab
			let url = window.location.href;
			if (!url.includes(plugin.namespace)) {
				return;
			}

			// Save current tab
			element.on('click', function () {
				const id = $(this).attr('id');
				if (id) {
					self.toStorage('nav-tab', '#' + id, ttl);
				}
			});

			// Load saved tab
			const id = self.getStorage('nav-tab');
			if ($(id).length) {
				$(id).tab('show');
			}

			// Click tab link
			link.on('click', function (e) {
				e.preventDefault();
				const id = $(this).attr('data-target');
				const target = '#' + id;
				if ($(target).length) {
					$(target).tab('show');
				}
			});

		}

		// toStorage
		VanillePlugin.toStorage = function (key, value, ttl) {
			key = self.applyNamesapce(key);
			const data = {
				value: value,
				ttl: (ttl) ? Date.now() + parseInt(ttl) : false
			};
			localStorage.setItem(key, JSON.stringify(data));
		}

		// getStorage
		VanillePlugin.getStorage = function (key) {

			const _key = key;
			key = self.applyNamesapce(key);

			let data = localStorage.getItem(key);
			data = JSON.parse(data);
			let value;

			if (data && data?.ttl > Date.now()) {
				value = data?.value;

			} else {
				self.removeStorage(_key);
			}

			return value;

		}

		// removeStorage
		VanillePlugin.removeStorage = function (key) {
			key = self.applyNamesapce(key);
			localStorage.removeItem(key);
		}

		// purgeStorage
		VanillePlugin.purgeStorage = function () {
			localStorage.clear();
		}

		// applyNamesapce
		VanillePlugin.applyNamesapce = function (value) {
			value = value || 'global';
			return plugin.namespace + '-' + value;
		}

		// online
		VanillePlugin.online = function (callback) {
			$(window).on('online', function () {
				if (typeof callback === 'function') {
					callback();

				} else {
					self.notify(plugin.strings.online, 'success', 3000);
				}
			});
		}

		// offline
		VanillePlugin.offline = function (callback) {
			$(window).on('offline', function () {
				if (typeof callback === 'function') {
					callback();

				} else {
					self.notify(plugin.strings.offline, 'error', 0);
				}
			});
		}

		// serviceWorker
		VanillePlugin.serviceWorker = function (path) {
			if ('serviceWorker' in navigator) {
				navigator.serviceWorker.register(`${plugin.baseUrl}${path}`)
					.then(reg => console.log(`Service worker registered : ${reg.scope}`))
					.catch(error => console.log(`Service worker registration failed : ${error}`));
			}
		}

		// detectOS
		VanillePlugin.detectOS = function () {

			const os = navigator.userAgent || navigator.vendor || window.opera;
			var isWindows = /windows phone/i.test(os);
			var isAndroid = /android/i.test(os);
			var isIOS = /iPad|iPhone|iPod/.test(os) && !window.MSStream;

			if (isWindows) {
				$('.windows-device').addClass('is-active');
				$('.mobile-device').addClass('is-active');

			} else if (isAndroid) {
				$('.android-device').addClass('is-active');
				$('.mobile-device').addClass('is-active');

			} else if (isIOS) {
				$('.ios-device').addClass('is-active');
				$('.mobile-device').addClass('is-active');

			} else {
				$('.non-mobile-device').addClass('is-active');
			}
		}

		// darkMode
		VanillePlugin.darkMode = function () {

			const key = 'dark-mode';
			const className = 'is-dark-mode';
			const body = $('body');
			const switcher = $('[data-name="dark-mode"]');

			const applyDark = () => {
				if (!body.hasClass(className)) {
					body.addClass(className);
				}
			};

			const disableDark = () => {
				if (body.hasClass(className)) {
					body.addClass(className);
				}
			};

			const isActive = () => {
				const status = self.getStorage(key);
				return (parseInt(status) === 1);
			};

			if (isActive()) {
				applyDark();
				switcher.attr('checked', true);

			} else {
				disableDark();
				switcher.attr('checked', false);
			}

			// Change
			switcher.on('change', function () {
				if (isActive()) {
					applyDark();
					localStorage.setItem(key, 0);
					switcher.attr('checked', false);

				} else {
					body.addClass(active);
					switcher.attr('checked', true);
					localStorage.setItem(key, 1);
				}
			});

			switcher.on('change', function () {
				switcher.prop('checked', this.checked);
			});

		}

		// initTable
		VanillePlugin.initTable = function (selector, args) {

			const table = $(selector);
			if (!table.length) return table;

			args = $.extend({
				dom: 'rtip', // Bfrtipl
				ajax: {},
				order: [0, 'asc'], // [[0,"asc"]]
				language: { url: '' },
				searching: true,
				ordering: true,
				pageLength: 5,
				info: true,
				paging: true,
				select: false,
				stateSave: false,
				autoWidth: false,
				destroy: false,
				processing: false,
				serverSide: false,
				deferRender: false,
				lengthMenu: false, // [[10,25,50,-1], [10,25,50,"All"]]
				pagingType: 'simple_numbers',
				columnDefs: [],
				buttons: [],
				initComplete: function () { },
				createdRow: function () { },
				fnDrawCallback: function () { }
			}, args);

			return table.DataTable({
				dom: settings.dom,
				ajax: settings.ajax,
				order: settings.order,
				language: settings.language,
				searching: settings.searching,
				ordering: settings.ordering,
				pageLength: settings.pageLength,
				info: settings.info,
				paging: settings.paging,
				select: settings.select,
				stateSave: settings.stateSave,
				autoWidth: settings.autoWidth,
				destroy: settings.destroy,
				processing: settings.processing,
				serverSide: settings.serverSide,
				deferRender: settings.deferRender,
				lengthMenu: settings.lengthMenu,
				pagingType: settings.pagingType,
				columnDefs: settings.columnDefs,
				buttons: settings.buttons,
				initComplete: settings.initComplete,
				createdRow: settings.createdRow,
				fnDrawCallback: settings.fnDrawCallback
			});
		};

		// doLogout
		VanillePlugin.doLogout = function () {
			$('.logout').on('click', function (e) {
				e.preventDefault();
				$('body').trigger('click');
				self.notify(self.getString('logout'), 'warning');
				setTimeout(function () {
					window.location.href = Gen.baseUrl + '/admin/logout/h/?--token=' + Gen.token;
				}, 500);
			});
		}

		// doNavbar
		VanillePlugin.doNavbar = function () {
			const nav = $('#main-nav');
			if (!nav.length) return;
			if ($(window).scrollTop() === 0) {
				nav.removeClass('navbar-shrink');
			} else {
				nav.addClass('navbar-shrink');
			}
		}

		// doToggle (mobile)
		VanillePlugin.doToggle = function () {

			const navId = '#main-nav';
			const nav = $(navId);
			if (nav.length) {
				$('body').scrollspy({
					target: navId,
					offset: 50
				});
			}

			const toggle = $('.navbar-toggler');
			const item = $('#navbarResponsive .nav-link');

			item.on('click', function () {
				if (toggle.css('display') !== 'none') {
					toggle.click();
				}
			});

		}

		// doCookie
		VanillePlugin.doCookie = function () {

			if (plugin.modules.cookies !== 'on') return;
			const name = window.location.hostname;
			if (document.cookie.includes(name)) return;

			const strings = self.getString();
			const str = strings.cookie;

			const title = str.title;
			const message = str.message;
			const accept = str.accept;
			const decline = str.decline;
			const more = strings.more;

			const link = self.getBaseUrl(self.getLinking('privacy'));
			const close = true;
			const icon = true;

			let box = '<div class="cookie-wrapper">';
			box += '<div class="cookie-header">';

			if (icon === true) {
				box += '<span class="cookie-icon"></span>';
			}

			box += '<span class="cookie-title">' + title + '</span>';
			box += '</div>';
			box += '<div class="cookie-message">';
			box += '<p>' + message + '.';

			if (link) {
				box += '<br><a href="' + link + '" rel="nofollow">' + more + '</a>';
			}

			box += '</p>';
			box += '</div>';
			box += '<div class="cookie-action">';
			box += '<button class="cookie-button" data-action="accept">' + accept + '</button>';

			if (close === true) {
				box += '<button class="cookie-button" data-action="decline">' + decline + '</button>';
			}

			box += '</div>';
			box += '</div>';

			$('body').append(box);
			const cookieBox = $('.cookie-wrapper');
			const cookieButtons = $('.cookie-button');
			cookieBox.addClass('show');

			cookieButtons.on('click', function () {
				cookieBox.removeClass('show');
				const action = $(this).data('action');
				if (action === 'accept') {
					const days = 30;
					const expire = 60 * 60 * 24 * days;
					document.cookie = 'COOKIES=' + name + '; max-age=' + expire + '; path=/';
				}
			});
		}

		// doClick
		VanillePlugin.doClick = function () {
			$('[data-target]').on('click', function (e) {

				e.preventDefault();

				const menu = $('.navbar-toggler');
				if (!menu.hasClass('collapsed')) {
					menu.trigger('click');
				}

				const element = $(this);
				const link = element.attr('data-target');
				if (!link) return;
				const blank = element.attr('data-new') == 'true' ? true : false;
				const space = 30;

				if (link == 'up') {
					$('html, body').animate({
						scrollTop: 0
					}, 'smooth');

				} else if (link.startsWith('#') || link.startsWith('.')) {
					const tartet = $(link);
					if (tartet.length) {
						$('html, body').animate({
							scrollTop: tartet.offset().top - space
						}, 'smooth');
					}

				} else if (link.startsWith('/')) {
					self.goTo(self.getBaseUrl());

				} else if (link.startsWith('http') && blank) {
					self.goTo(link, true);

				} else if (link.startsWith('http')) {
					self.goTo(link);
				}
			});
		}

		// getString
		VanillePlugin.getString = function (item) {
			const strings = plugin.strings;
			if (item !== undefined) {
				return strings[item] ?? strings;
			}
			return strings;
		}

		// getLinking
		VanillePlugin.getLinking = function (item) {
			const urls = plugin.urls;
			if (item !== undefined) {
				return urls[item] ?? urls;
			}
			return urls;
		}

		// goTo
		VanillePlugin.goTo = function (url, blank) {
			blank = blank || false;
			url = url || '/';
			if (blank) {
				window.open(link, '_blank');
				return;
			}
			window.location.href = url;
		}

		// baseUrl
		VanillePlugin.baseUrl = function (url) {
			const baseUrl = window.location.protocol + '//' + window.location.host + '/';
			if (item !== undefined) {
				return baseUrl + url + '/'
			}
			return baseUrl;
		}

		// Return object
		return this;

	};

	// Attach to global jQuery object
	$.VanillePlugin = VanillePlugin;

})(jQuery);

/**
 * Dev server messages (organized here to prevent clutter)
 */

import stripAnsi from 'strip-ansi';
import { bold, dim, red, green, underline, yellow, bgYellow, cyan, bgGreen, black } from 'kleur/colors';
import { pad, emoji, getLocalAddress, getNetworkLogging } from './dev/util.js';
import os from 'os';
import type { AddressInfo } from 'net';
import type { AstroConfig } from '../@types/astro';

const PREFIX_PADDING = 6;

/** Display  */
export function req({ url, statusCode, reqTime }: { url: string; statusCode: number; reqTime?: number }): string {
	let color = dim;
	if (statusCode >= 500) color = red;
	else if (statusCode >= 400) color = yellow;
	else if (statusCode >= 300) color = dim;
	else if (statusCode >= 200) color = green;
	return `${bold(color(pad(`${statusCode}`, PREFIX_PADDING)))} ${pad(url, 40)} ${reqTime ? dim(Math.round(reqTime) + 'ms') : ''}`.trim();
}

export function reload({ file }: { file: string }): string {
	return `${green(pad('reload', PREFIX_PADDING))} ${file}`;
}

export function hmr({ file }: { file: string }): string {
	return `${green(pad('update', PREFIX_PADDING))} ${file}`;
}

/** Display dev server host and startup time */
export function devStart({
	startupTime,
	devServerAddressInfo,
	config,
	https,
	site,
}: {
	startupTime: number;
	devServerAddressInfo: AddressInfo;
	config: AstroConfig;
	https: boolean;
	site: URL | undefined;
}): string {
	// PACKAGE_VERSION is injected at build-time
	const version = process.env.PACKAGE_VERSION ?? '0.0.0';
	const rootPath = site ? site.pathname : '/';
	const localPrefix = `${dim('┃')} Local    `;
	const networkPrefix = `${dim('┃')} Network  `;

	const { address: networkAddress, port } = devServerAddressInfo;
	const localAddress = getLocalAddress(networkAddress, config);
	const networkLogging = getNetworkLogging(config);
	const toDisplayUrl = (hostname: string) => `${https ? 'https' : 'http'}://${hostname}:${port}${rootPath}`;
	let addresses = [];

	if (networkLogging === 'none') {
		addresses = [`${localPrefix}${bold(cyan(toDisplayUrl(localAddress)))}`];
	} else if (networkLogging === 'host-to-expose') {
		addresses = [`${localPrefix}${bold(cyan(toDisplayUrl(localAddress)))}`, `${networkPrefix}${dim('use --host to expose')}`];
	} else {
		addresses = Object.values(os.networkInterfaces())
			.flatMap((networkInterface) => networkInterface ?? [])
			.filter((networkInterface) => networkInterface?.address && networkInterface?.family === 'IPv4')
			.map(({ address }) => {
				if (address.includes('127.0.0.1')) {
					const displayAddress = address.replace('127.0.0.1', localAddress);
					return `${localPrefix}${bold(cyan(toDisplayUrl(displayAddress)))}`;
				} else {
					return `${networkPrefix}${bold(cyan(toDisplayUrl(address)))}`;
				}
			})
			// ensure Local logs come before Network
			.sort((msg) => (msg.startsWith(localPrefix) ? -1 : 1));
	}

	const messages = [`${emoji('🚀 ', '')}${bgGreen(black(` astro `))} ${green(`v${version}`)} ${dim(`started in ${Math.round(startupTime)}ms`)}`, '', ...addresses, ''];
	return messages.map((msg) => `  ${msg}`).join('\n');
}

export function prerelease({ currentVersion }: { currentVersion: string }) {
	const tag = currentVersion.split('-').slice(1).join('-').replace(/\..*$/, '');
	const badge = bgYellow(black(` ${tag} `));
	const headline = yellow(`▶ This is a ${badge} prerelease build`);
	const warning = `  Feedback? ${underline('https://astro.build/issues')}`;
	return [headline, warning, ''].map((msg) => `  ${msg}`).join('\n');
}

/** Display port in use */
export function portInUse({ port }: { port: number }): string {
	return `Port ${port} in use. Trying a new one…`;
}

/** Pretty-print errors */
export function err(error: Error): string {
	if (!error.stack) return stripAnsi(error.message);
	let message = stripAnsi(error.message);
	let stack = stripAnsi(error.stack);
	const split = stack.indexOf(message) + message.length;
	message = stack.slice(0, split);
	stack = stack.slice(split).replace(/^\n+/, '');
	return `${message}\n${dim(stack)}`;
}

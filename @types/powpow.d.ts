export type PowPowConfig = {
	/**
	 * Power Pages config config.
	 */
	portal: PortalConfig;

	/**
	 * TypeScript source config.
	 */
	typescript: TypeScriptConfig;

	/**
	 * Dev server config.
	 */
	devServer?: DevServerConfig;
};

export type DevServerConfig = {
	/**
	 * Whether the dev server should be enabled.
	 * Default: false
	 */
	enabled?: boolean;

	/**
	 * The port the dev server should listen on.
	 * Default: 8080
	 */
	port?: number;
};

export type PortalConfig = {
	/**
	 * The relative path to the Power Pages config directory.
	 */
	path: string;
};

export type TypeScriptConfig = {
	/**
	 * The relative path to the TypeScript source config directory.
	 */
	path: string;

	/**
	 * Optional injection of liquid code for handling dev mode.
	 */
	devConditionInjection?: string;

	/**
	 * Whether the TypeScript source should be minified.
	 * 
	 * @default false
	 */
	minify?: boolean;
};

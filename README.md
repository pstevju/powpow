# PowPow

**PowPow** is a Power Pages pro-code development tool that streamlines the development process by offering code transpilation and a local development server. It aims to reduce development iteration time and enable the use of TypeScript for authoring website code assets.

__Note that this tool is in early development and is not tested for production use. Use at own risk.__

## Installation

### Prerequisites

Before installing PowPow, ensure you have the following tools installed:

-   [PAC CLI](https://learn.microsoft.com/en-us/power-platform/developer/cli/introduction?tabs=windows)
-   [Node.js](https://nodejs.org/)

### Installing PowPow

You can install PowPow via npm:

```bash
npm install --save @pstevju/powpow
```

### Initialization

To initialize a new project with PowPow:

```bash
npx @pstevju/powpow --init
```

This will create a PowPow config file and a suitable \`tsconfig.json\` file for your project.

## Usage

### Starting the Development Server

To start the development server and transpilation watcher:

-   If PowPow is installed locally in the project, use:

    ```bash
    powpow
    ```

-   If PowPow is not installed in the project, use:

    ```bash
    npx @pstevju/powpow
    ```

### Initializing a Project

To initialize a new project:

-   If PowPow is installed locally in the project, use:

    ```bash
    powpow --init
    ```

-   If PowPow is not installed in the project, use:

    ```bash
    npx powpow --init
    ```

This will set up a default configuration for your project.

## Configuration

The default configuration file looks like this:

```javascript
/** @type {import('@pstevju/powpow').PowPowConfig} */
const config = {
	portal: {
		path: './portal',
	},
	typescript: {
		path: './typescript',
	},
	devServer: {
		enabled: true,
		port: 8080,
	},
};

export default config;
```

-   **portal.path**: The path to the Power Pages configuration directory.
-   **typescript.path**: The path to the TypeScript source code directory.
-   **devServer.enabled**: Whether to enable the local development server.
-   **devServer.port**: The port on which the development server will run.

## Development Workflow

### Using TypeScript Transpilation

In the TypeScript source code folder, the files should be named to match the Power Pages asset they target:

-   For a web template located at \`my-power-pages-config/web-template/my-web-template/My-Web-Template.webtemplate.source.html\`, the TypeScript source file should be named \`My-Web-Template.webtemplate.ts\`.
-   For a web page at \`my-power-pages-config/web-pages/my-web-page/content-pages/My-Web-Page.nb-NO.webpage.copy.html\`, the TypeScript source should be \`My-Web-Page.nb-NO.webpage.ts\`.

-   For a basic form with custom JavaScript at \`my-power-pages-config/basic-forms/my-basic-form/My-Basic-Form.basicform.custom_javascript.js\`, the TypeScript source should be \`My-Basic-Form.basicform.ts\`.

If you don't want to use the TypeScript transpilation features, simply keep the TypeScript source directory empty. The local development server will still serve the HTML files directly from the Power Pages asset directories.

### Using the Local Development Server

To inject JavaScript from the local dev server when in development mode, modify your HTML files as follows:

1. Add the following snippet to the HTML page:

    ```liquid
    {% if request.params['dev'] == 'true' %}
      <script src="http://localhost:8080/web-pages/my-web-page/content-pages/My-Web-Page.nb-NO.webpage.custom_javascript.js"></script>
    {% endif %}
    ```

2. If the JavaScript resource is not created using the TypeScript transpiler, add matching logic within the JavaScript file:

    - At the top of the file:

        ```liquid
        /* {%- if request.params['dev'] != 'true' -%} */
        ```

    - At the bottom of the file:

        ```liquid
        /* {%- endif -%} */
        ```

The local dev server will load the JavaScript regardless of this condition, but when uploaded to the Power Platform, the Liquid engine will remove the JavaScript based on the condition.

## Issues

If you encounter issues with PowPow, you can troubleshoot common problems by checking the following:

-   Ensure that all paths in your configuration file are correct.
-   Verify that the required prerequisites (PAC CLI and Node.js) are properly installed.

For additional help or to report bugs, please use the [GitHub Issues](#) page of this repository.

## License

This project is licensed under the ISC License. See the LICENSE file for more details.

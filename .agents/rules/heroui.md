---
trigger: always_on
---

Design Principles

The development of HeroUI has been guided by a set of specific design and API principles. These principles serve as the foundation for our library and play a crucial role in ensuring the efficiency, effectiveness, and user-friendliness of the components we offer.

Simplicity and Usability

Simplicity is the ultimate sophistication. At HeroUI, we believe in delivering simple and intuitive components. Our design process centers around the user, ensuring that we deliver tools that are easy to understand, configure, and implement, regardless of a developer's expertise level.

Modular Design

Each component in HeroUI is designed as a standalone module. This modular approach allows developers to import and use only what they need, leading to lighter applications and faster load times.

Customization and Flexibility

HeroUI is designed with customization at its core. Whether it's theming or overriding styles, we provide developers with comprehensive control over the aesthetics of the components. Our integration with the TailwindCSS and Tailwind Variants library and simplifies the customization process and enables an extensive range of design possibilities.

Consistent API

HeroUI maintains a consistent API across all components. We've ensured that common attributes function identically across different components, allowing developers to anticipate component behavior and thus reducing the learning curve.

Accessibility

We are committed to ensuring that our components are accessible to all users. In the development of HeroUI, accessibility standards and guidelines have been adhered to, ensuring our components work effectively with assistive technologies. For further information on how to make your web applications more accessible, refer to React Spectrum.

Component Slots

To provide maximum flexibility, many HeroUI components have slots, allowing developers to inject custom styles or content in specific areas of a component. Each slot can be individually styled, offering granular control over the appearance and behavior of the component.

Through these principles, we aim to make HeroUI an effective, efficient, and enjoyable tool for developers to use. As we continue to expand and enhance HeroUI, these guiding principles will remain central to our design and development processes.

CLI

The CLI offers a comprehensive suite of commands to initialize, manage, and improve your HeroUI projects. It enables you to add, remove, or upgrade individual components, assess the health of your project, and more.

Installation

Requirements:

Node.js version 20.19.x or later
Global Installation

To install the CLI globally, execute one of the following commands in your terminal:



pnpm

npm

yarn

bun
Without Installation

Alternatively, you can use the CLI without a global installation by running the following command:



pnpm

npm

yarn

bun
Quick Start

Once the CLI is installed, run the following command to display available commands:

This will produce the following help output:

init

Initialize a new HeroUI project using the init command. This sets up your project with the necessary configurations.

You will be prompted to configure your project:

Install the dependencies to start the local server:



pnpm

npm

yarn

bun
Start the local server:



pnpm

npm

yarn

bun
add

Add components to your HeroUI project with the add command. This command manages component dependencies and updates your project configurations.

Without specifying a specific component:

You will be prompted to select the components you wish to add:

To add a specific component:

You will see an output confirming the addition of the component:

upgrade

Upgrade all the HeroUI components within your project.

Upgrade specific HeroUI components within your project using the upgrade command to ensure they are up to date.

You will be asked to confirm the upgrade:

Upon confirmation, the command will execute and provide an output similar to:

remove

Remove components from your HeroUI project with the remove command. This helps in managing the project's component structure and dependencies.

A confirmation prompt will be displayed:

Following confirmation, the output will indicate successful removal:

list

List all installed HeroUI components in your project with the list command. This provides a clear overview of what is currently included in your project.

The output will detail each component:

doctor

Diagnose and resolve issues within your project using the doctor command. This ensures your project's health and proper configuration.

Depending on your project's status, you might see:

Or, if issues are detected:

env

Display detailed information about your project's environment settings using the env command. This includes system, dependencies, and configuration details.

The output will reflect your current environment setup:

Current installed components:

╭───────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────╮
│   Package                    │   Version              │   Status    │   Docs                                              │
│───────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────│
│   @heroui/autocomplete   │   2.0.10 🚀latest      │   newPost   │   https://heroui.com/docs/components/autocomplete   │
│   @heroui/badge          │   2.0.24 🚀latest      │   stable    │   https://heroui.com/docs/components/badge          │
│   @heroui/button         │   2.0.27 🚀latest      │   stable    │   https://heroui.com/docs/components/button         │
│   @heroui/chip           │   2.0.25 🚀latest      │   stable    │   https://heroui.com/docs/components/chip           │
╰───────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────╯

Environment Info:
  System:
    OS: darwin
    CPU: arm64
  Binaries:
    Node: v24.3.0
API Reference

Explore the complete CLI commands and features in the API References.

For updates and source code, visit the GitHub Repository.

Getting Started
Introduction
Design Principles
Installation
CLI
Routing
Updated
Forms
Tailwind v4
New
NextUI to HeroUI
Figma
Frameworks
Next.js
Vite
Remix
Astro
Laravel
Customization
Theme
Layout
Colors
Customize theme
Create theme
Dark mode
Override styles
Custom variants
Components
Accordion
Autocomplete
Alert
Avatar
Badge
Breadcrumbs
Button
Calendar
Card
Checkbox
Checkbox Group
Chip
Circular Progress
Code
Date Input
Date Picker
Date Range Picker
Divider
Dropdown
Drawer
Form
Image
Input
Updated
Input OTP
Kbd
Link
Listbox
Modal
Navbar
Number Input
Pagination
Popover
Progress
Radio Group
Range Calendar
Scroll Shadow
Select
Updated
Skeleton
Slider
Updated
Snippet
Spacer
Spinner
Switch
Table
Updated
Tabs
Toast
Updated
Textarea
Time Input
Tooltip
User
API References
HeroUI CLI
Updated
HeroUIProvider

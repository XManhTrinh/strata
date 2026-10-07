// ─── Buttons ──────────────────────────────────────────────────────────────────
export {
  Button,
  buttonVariants,
  IconButton,
  iconButtonVariants,
  FAB,
  fabVariants,
  ExtendedFAB,
  extendedFabVariants,
  FABMenu,
  FABMenuItemComponent,
  SplitButton,
  SplitButtonLeading,
  splitButtonVariants,
  ButtonGroup,
  ButtonGroupItem,
} from "./buttons";
export type {
  ButtonProps,
  IconButtonProps,
  FABProps,
  FABColor,
  ExtendedFABProps,
  FABMenuItem,
  FABMenuProps,
  FABMenuItemComponentProps,
  SplitButtonProps,
  SplitButtonLeadingProps,
  ButtonGroupProps,
  ButtonGroupItemProps,
} from "./buttons";

// ─── Dialog ───────────────────────────────────────────────────────────────────
export {
  Dialog,
  DialogPortal,
  DialogOverlay,
  DialogClose,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
} from "./dialog";

// ─── Tooltip ──────────────────────────────────────────────────────────────────
export { Tooltip, tooltipVariants } from "./tooltip";
export type { TooltipProps } from "./tooltip";

// ─── Icon ─────────────────────────────────────────────────────────────────────
export { Icon } from "./icon";
export type { IconProps } from "./icon";

// ─── Badge ────────────────────────────────────────────────────────────────────
export { Badge } from "./badge";
export type { BadgeProps } from "./badge";

// ─── Card ─────────────────────────────────────────────────────────────────────
export {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
  cardVariants,
} from "./card";
export type { CardProps } from "./card";

// ─── Checkbox ─────────────────────────────────────────────────────────────────
export { Checkbox } from "./checkbox";
export type { CheckboxProps } from "./checkbox";

// ─── Chip ─────────────────────────────────────────────────────────────────────
export { Chip, chipVariants } from "./chip";
export type { ChipProps } from "./chip";

// ─── Radio ────────────────────────────────────────────────────────────────────
export { Radio, RadioGroup } from "./radio";
export type { RadioProps, RadioGroupProps } from "./radio";

// ─── Switch ───────────────────────────────────────────────────────────────────
export { Switch } from "./switch";
export type { SwitchProps } from "./switch";

// ─── Search ───────────────────────────────────────────────────────────────────
export { Search, SearchLeadingIcon, SearchInput, SearchTrailingIcon, useSearch } from "./search";
export {
  SearchView,
  SearchViewHeader,
  SearchViewInput,
  SearchViewDivider,
  SearchViewContent,
} from "./search";
export type {
  SearchProps,
  SearchContextValue,
  SearchLeadingIconProps,
  SearchInputProps,
  SearchTrailingIconProps,
  SearchViewProps,
  SearchViewHeaderProps,
  SearchViewInputProps,
  SearchViewDividerProps,
  SearchViewContentProps,
} from "./search";

// ─── Tabs ─────────────────────────────────────────────────────────────────────
export { Tabs, TabList, Tab, TabContent } from "./tabs";
export type { TabsProps, TabListProps, TabProps, TabContentProps } from "./tabs";

// ─── Divider ──────────────────────────────────────────────────────────────────
export { Divider } from "./divider";
export type { DividerProps } from "./divider";

// ─── List ─────────────────────────────────────────────────────────────────────
export { List, ListItem } from "./list";
export type { ListProps, ListItemProps } from "./list";

// ─── Menu ─────────────────────────────────────────────────────────────────────
export { Menu, MenuItem, MenuHeader, MenuDivider, MenuSub, MenuSubTrigger, MenuSubContent } from "./menu";
export type {
  MenuProps,
  MenuItemProps,
  MenuHeaderProps,
  MenuDividerProps,
  MenuSubProps,
  MenuSubTriggerProps,
  MenuSubContentProps,
  MenuDensity,
} from "./menu";

// ─── Select (Exposed Dropdown Menu) ──────────────────────────────────────────
export { Select } from "./select";
export type { SelectProps, SelectOption } from "./select";

// ─── Navigation ───────────────────────────────────────────────────────────────
export { NavigationBar, useNavigationBar } from "./navigation";
export type {
  NavigationBarProps,
  NavigationBarItem,
  NavigationBarItemData,
  NavigationBarItemProps,
  NavigationBarContextValue,
} from "./navigation";

export { NavigationRail, useNavigationRail } from "./navigation";
export type {
  NavigationRailProps,
  NavigationRailHeaderProps,
  NavigationRailContentProps,
  NavigationRailFooterProps,
  NavigationRailItemProps,
} from "./navigation";

// ─── Snackbar ─────────────────────────────────────────────────────────────────
export { SnackbarProvider, useSnackbar } from "./snackbar";
export type {
  SnackbarMessage,
  SnackbarProviderProps,
  SnackbarContextValue,
} from "./snackbar";

// ─── App Bar ──────────────────────────────────────────────────────────────────
export { AppBar, AppBarLeading, AppBarHeadline, AppBarTrailing, useAppBar, useAppBarCollapse, PageBar } from "./app-bar";
export type {
  AppBarProps,
  AppBarVariant,
  AppBarContextValue,
  AppBarLeadingProps,
  AppBarHeadlineProps,
  AppBarTrailingProps,
  UseAppBarCollapseOptions,
  UseAppBarCollapseReturn,
  PageBarProps,
} from "./app-bar";

// ─── Sheets ───────────────────────────────────────────────────────────────────
export {
  BottomSheet,
  useBottomSheet,
  BottomSheetHandle,
  BottomSheetHeader,
  BottomSheetContent,
  BottomSheetActions,
} from "./sheets";
export type {
  BottomSheetProps,
  BottomSheetContextValue,
  BottomSheetHandleProps,
  BottomSheetHeaderProps,
  BottomSheetContentProps,
  BottomSheetActionsProps,
} from "./sheets";

export {
  SideSheet,
  useSideSheet,
  SideSheetHeader,
  SideSheetContent,
  SideSheetActions,
} from "./sheets";
export type {
  SideSheetProps,
  SideSheetContextValue,
  SideSheetHeaderProps,
  SideSheetContentProps,
  SideSheetActionsProps,
} from "./sheets";

// ─── Toolbar ──────────────────────────────────────────────────────────────────
export {
  Toolbar,
  ToolbarLeading,
  ToolbarHeadline,
  ToolbarActions,
} from "./toolbar";
export type {
  ToolbarProps,
  ToolbarComponentProps,
  ToolbarLeadingProps,
  ToolbarHeadlineProps,
  ToolbarActionsProps,
} from "./toolbar";

// ─── Slider ───────────────────────────────────────────────────────────────────
export { Slider } from "./slider";
export type { SliderProps, SliderSize, SliderComponentProps } from "./slider";

// ─── Text Field ───────────────────────────────────────────────────────────────
export { TextField } from "./text-field";
export type { TextFieldProps } from "./text-field";

// ─── Indicators ───────────────────────────────────────────────────────────────
export { LinearProgress, CircularProgress, LoadingIndicator } from "./indicators";
export type { LinearProgressProps, CircularProgressProps, LoadingIndicatorProps } from "./indicators";

// ─── Carousel ─────────────────────────────────────────────────────────────────
export { Carousel, CarouselItem } from "./carousel";
export type { CarouselProps, CarouselItemProps, CarouselVariant } from "./carousel";

// ─── Pickers ──────────────────────────────────────────────────────────────────
export { DatePicker, DatePickerModal, TimePicker } from "./pickers";
export type { DatePickerProps, DatePickerModalProps, DateRange, TimePickerProps, TimeValue } from "./pickers";

// ─── Typography ───────────────────────────────────────────────────────────────
export { Typography, typographyVariants, ELEMENT_MAP } from "./typography";
export type {
  TypographyProps,
  TypographyVariant,
  TypographyColor,
} from "./typography";

// ─── Motion Utilities ─────────────────────────────────────────────────────────
export { duration, easing, spring, transition, SCALE_INITIAL } from "./lib/motion";

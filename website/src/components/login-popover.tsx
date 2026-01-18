import { Button } from "~/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "~/components/ui/popover";
import { LoginOptions } from "~/components/login-options";

type LoginPopoverProps = {
	buttonLabel?: string;
	buttonVariant?: React.ComponentProps<typeof Button>["variant"];
	buttonClassName?: string;
};

export function LoginPopover({
	buttonLabel = "Login",
	buttonVariant = "outline",
	buttonClassName,
}: LoginPopoverProps) {
	return (
		<Popover>
			<PopoverTrigger asChild>
				<Button
					variant={buttonVariant}
					className={buttonClassName}
				>
					{buttonLabel}
				</Button>
			</PopoverTrigger>
			<PopoverContent align="end" className="z-50 w-60 border-white/10 bg-slate-900">
				<LoginOptions />
			</PopoverContent>
		</Popover>
	);
}

import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { AppSwitcherComponent, SoporteComponent } from '@reddoc/ui';
import { UserMenuComponent } from '../../shared/user-menu/user-menu.component';

@Component({
  selector: 'app-shell-layout',
  standalone: true,
  imports: [RouterOutlet, UserMenuComponent, AppSwitcherComponent, SoporteComponent],
  templateUrl: './shell-layout.component.html',
  styleUrl: './shell-layout.component.scss',
})
export class ShellLayoutComponent {}

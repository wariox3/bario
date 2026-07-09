import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { UserMenuComponent } from '../../shared/user-menu/user-menu.component';
import { AppSwitcherComponent } from '../../shared/app-switcher/app-switcher.component';

@Component({
  selector: 'app-shell-layout',
  standalone: true,
  imports: [RouterOutlet, UserMenuComponent, AppSwitcherComponent],
  templateUrl: './shell-layout.component.html',
  styleUrl: './shell-layout.component.scss',
})
export class ShellLayoutComponent {}

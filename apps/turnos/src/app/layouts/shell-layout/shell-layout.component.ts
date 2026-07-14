import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { AppSwitcherComponent } from '@reddoc/ui';
import { UserMenuComponent } from '../../shared/user-menu/user-menu.component';

@Component({
  selector: 'app-shell-layout',
  standalone: true,
  imports: [RouterOutlet, UserMenuComponent, AppSwitcherComponent],
  templateUrl: './shell-layout.component.html',
  styleUrl: './shell-layout.component.scss',
})
export class ShellLayoutComponent {}

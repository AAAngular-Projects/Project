import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  WritableSignal,
  computed,
  effect,
  signal,
  inject,
  OnDestroy,
} from '@angular/core';
import {
  FormArray,
  FormBuilder,
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import {
  CreateMessagePayload,
  CreateMessageTemplatePayload,
  Message,
  RoleType,
  MessageQuery,
} from '../../core/models';
import { AuthService, MessageService } from '../../core/services';
import { Subject, takeUntil } from 'rxjs';

@Component({
  selector: 'app-messages',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './messages.component.html',
  styleUrl: './messages.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MessagesComponent implements OnInit, OnDestroy {
  private readonly messageService = inject(MessageService);
  private readonly authService = inject(AuthService);
  private readonly fb = inject(FormBuilder);
  private readonly destroy$ = new Subject<void>();

  // Messages state using signals
  private readonly messagesSignal = signal<Message[]>([]);
  private readonly isLoadingSignal = signal(false);
  private readonly errorSignal = signal<Error | null>(null);

  // Public computed signals
  readonly messages = this.messagesSignal.asReadonly();
  readonly isLoading = this.isLoadingSignal.asReadonly();
  readonly hasError = computed(() => this.errorSignal() !== null);
  readonly error = this.errorSignal.asReadonly();
  
  // Role-based computed signals
  readonly currentUser = this.authService.currentUser;
  readonly userRole = this.authService.role;
  readonly isAuthenticated = this.authService.isAuthenticated;
  
  // Role checks for UI display
  readonly canCreateMessages = computed(() => {
    const role = this.userRole();
    return role === RoleType.ADMIN || role === RoleType.ROOT;
  });
  
  readonly canViewMessages = computed(() => {
    const role = this.userRole();
    return role === RoleType.USER || role === RoleType.ADMIN || role === RoleType.ROOT;
  });

  // Form for creating messages (simplified)
  readonly createMessageForm: FormGroup = this.fb.group({
    recipient: ['', [Validators.required, Validators.pattern(/^[0-9]{6}$/), Validators.min(100000), Validators.max(999999)]],
    subject: ['', Validators.required],
    content: ['', Validators.required],
  });

  readonly selectedMessage: WritableSignal<Message | null> = signal(null);
  readonly isCreatingMessage = signal(false);
  readonly createFormVisible = signal(false);

  // Computed values
  readonly unreadCount = computed(
    () => this.messages().filter((message: Message) => !message.readed).length,
  );

  // Auto-select first message effect
  private readonly autoSelectMessageEffect = effect(() => {
    const messages = this.messages();
    if (messages.length && !this.selectedMessage()) {
      this.selectedMessage.set(messages[0]);
    }
  });

  ngOnInit(): void {
    this.loadMessages();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private loadMessages(query: MessageQuery = { page: 1, take: 20, order: 'DESC' }): void {
    this.isLoadingSignal.set(true);
    this.errorSignal.set(null);

    this.messageService.loadMessagesObservable(query)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          this.messagesSignal.set(response.data);
          this.isLoadingSignal.set(false);
        },
        error: (error) => {
          console.error('Error loading messages:', error);
          this.errorSignal.set(error);
          this.isLoadingSignal.set(false);
        }
      });
  }

  trackByUuid(_: number, item: Message): string {
    return item.uuid;
  }

  selectMessage(message: Message): void {
    this.selectedMessage.set(message);

    if (!message.readed) {
      this.messageService.markAsReadObservable({ uuid: message.uuid })
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: () => {
            // Update the message in our local state
            this.messagesSignal.update(messages => 
              messages.map(m => m.uuid === message.uuid ? { ...m, readed: true } : m)
            );
          },
          error: (error) => console.error('Error marking message as read:', error)
        });
    }
  }

  markAllAsRead(): void {
    this.messageService.markAsReadObservable()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          // Update all messages as read in local state
          this.messagesSignal.update(messages => 
            messages.map(m => ({ ...m, readed: true }))
          );
        },
        error: (error) => console.error('Error marking all messages as read:', error)
      });
  }

  toggleCreateForm(): void {
    this.createFormVisible.update(visible => !visible);
    if (!this.createFormVisible()) {
      this.createMessageForm.reset();
    }
  }

  refreshMessages(): void {
    this.loadMessages();
  }

  submit(): void {
    if (this.createMessageForm.valid && !this.isCreatingMessage()) {
      this.isCreatingMessage.set(true);
      const payload = this.buildCreateMessagePayload();
      
      this.messageService.createMessageObservable(payload)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (message) => {
            // Add the new message to the top of the list
            this.messagesSignal.update(messages => [message, ...messages]);
            this.createMessageForm.reset();
            this.createFormVisible.set(false);
            this.isCreatingMessage.set(false);
          },
          error: (error) => {
            console.error('Error creating message:', error);
            alert('Error creating message: ' + (error.error?.message || error.message || 'Unknown error'));
            this.isCreatingMessage.set(false);
          }
        });
    } else {
      this.createMessageForm.markAllAsTouched();
    }
  }

  private buildCreateMessagePayload(): CreateMessagePayload {
    const currentUser = this.currentUser();
    if (!currentUser) {
      throw new Error('No authenticated user found');
    }

    if (!currentUser.userAuth?.pinCode) {
      throw new Error('Current user does not have a valid PIN code');
    }

    const recipientPinCode = parseInt(this.createMessageForm.get('recipient')?.value as string);
    const subject = (this.createMessageForm.get('subject')?.value as string).trim();
    const content = (this.createMessageForm.get('content')?.value as string).trim();

    if (isNaN(recipientPinCode)) {
      throw new Error('Recipient PIN code must be a valid number');
    }

    console.log('Creating message with sender PIN:', currentUser.userAuth.pinCode);
    console.log('Creating message with recipient PIN:', recipientPinCode);

    // Create a simple template with just subject and content
    const templates: CreateMessageTemplatePayload[] = [{
      language: 'en', // Default to English
      subject,
      content,
    }];

    return {
      senderPinCode: currentUser.userAuth.pinCode,
      recipientPinCode,
      key: 'WELCOME_MESSAGE', // Use predefined message key name - backend will handle UUID lookup
      templates,
    } as CreateMessagePayload;
  }
}

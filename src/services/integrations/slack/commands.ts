import { createCapture, getProjectsByUserId, getTasksByUserId } from '@/lib/db/queries';
import { generateSmartSuggestions } from '@/services/ai/suggestion-generator';

interface SlackCommandResponse {
  response_type: 'ephemeral' | 'in_channel';
  text: string;
  blocks?: object[];
}

export async function handleSlackCommand(
  command: string,
  text: string,
  userId: string
): Promise<SlackCommandResponse> {
  switch (command) {
    case '/catalyst':
      return handleCatalystCommand(text, userId);
    case '/catalyst-capture':
      return handleCaptureCommand(text, userId);
    case '/catalyst-tasks':
      return handleTasksCommand(userId);
    case '/catalyst-suggest':
      return handleSuggestCommand(userId);
    default:
      return {
        response_type: 'ephemeral',
        text: `Unknown command: ${command}`,
      };
  }
}

async function handleCatalystCommand(
  text: string,
  userId: string
): Promise<SlackCommandResponse> {
  const args = text.trim().split(' ');
  const subcommand = args[0]?.toLowerCase();

  switch (subcommand) {
    case 'capture':
      return handleCaptureCommand(args.slice(1).join(' '), userId);
    case 'tasks':
      return handleTasksCommand(userId);
    case 'suggest':
      return handleSuggestCommand(userId);
    case 'projects':
      return handleProjectsCommand(userId);
    case 'help':
    default:
      return {
        response_type: 'ephemeral',
        text: 'Catalyst Launch Commands',
        blocks: [
          {
            type: 'section',
            text: {
              type: 'mrkdwn',
              text: '*Available Commands:*\n• `/catalyst capture [text]` - Quick capture an idea or note\n• `/catalyst tasks` - View your current tasks\n• `/catalyst suggest` - Get AI task suggestions\n• `/catalyst projects` - View your projects\n• `/catalyst help` - Show this help message',
            },
          },
        ],
      };
  }
}

async function handleCaptureCommand(
  text: string,
  userId: string
): Promise<SlackCommandResponse> {
  if (!text.trim()) {
    return {
      response_type: 'ephemeral',
      text: 'Please provide text to capture. Usage: `/catalyst capture Your idea here`',
    };
  }

  try {
    await createCapture({
      userId,
      content: text.trim(),
      type: 'idea',
    });

    return {
      response_type: 'ephemeral',
      text: `Captured: "${text.trim()}"`,
      blocks: [
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `*Captured!* :white_check_mark:\n>${text.trim()}`,
          },
        },
        {
          type: 'context',
          elements: [
            {
              type: 'mrkdwn',
              text: 'View and process this capture in <https://catalyst.app/captures|Catalyst Launch>',
            },
          ],
        },
      ],
    };
  } catch (error) {
    console.error('Error capturing from Slack:', error);
    return {
      response_type: 'ephemeral',
      text: 'Failed to capture. Please try again.',
    };
  }
}

async function handleTasksCommand(userId: string): Promise<SlackCommandResponse> {
  try {
    const tasks = await getTasksByUserId(userId, undefined, 'today');
    const inProgressTasks = await getTasksByUserId(userId, undefined, 'in_progress');

    const allTasks = [...tasks, ...inProgressTasks];

    if (allTasks.length === 0) {
      return {
        response_type: 'ephemeral',
        text: 'No tasks for today. Use `/catalyst suggest` to get AI suggestions!',
      };
    }

    const taskBlocks = allTasks.slice(0, 5).map((task) => ({
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: `${task.status === 'in_progress' ? ':arrows_counterclockwise:' : ':white_circle:'} *${task.title}*${task.priority === 'high' || task.priority === 'urgent' ? ' :fire:' : ''}`,
      },
    }));

    return {
      response_type: 'ephemeral',
      text: `Your Tasks (${allTasks.length})`,
      blocks: [
        {
          type: 'header',
          text: {
            type: 'plain_text',
            text: `Your Tasks (${allTasks.length})`,
          },
        },
        ...taskBlocks,
        {
          type: 'context',
          elements: [
            {
              type: 'mrkdwn',
              text: '<https://catalyst.app/tasks|View all tasks in Catalyst Launch>',
            },
          ],
        },
      ],
    };
  } catch (error) {
    console.error('Error fetching tasks for Slack:', error);
    return {
      response_type: 'ephemeral',
      text: 'Failed to fetch tasks. Please try again.',
    };
  }
}

async function handleSuggestCommand(userId: string): Promise<SlackCommandResponse> {
  try {
    const suggestions = await generateSmartSuggestions(userId, undefined, 3);

    const suggestionBlocks = suggestions.tasks.map((task) => ({
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: `:sparkles: *${task.title}*\n${task.description}`,
      },
    }));

    return {
      response_type: 'ephemeral',
      text: 'AI Suggestions',
      blocks: [
        {
          type: 'header',
          text: {
            type: 'plain_text',
            text: ':robot_face: AI Suggestions',
          },
        },
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `*Focus Area:* ${suggestions.focusArea}`,
          },
        },
        ...suggestionBlocks,
        {
          type: 'context',
          elements: [
            {
              type: 'mrkdwn',
              text: '<https://catalyst.app/tasks|Add these to your task board>',
            },
          ],
        },
      ],
    };
  } catch (error) {
    console.error('Error generating suggestions for Slack:', error);
    return {
      response_type: 'ephemeral',
      text: 'Failed to generate suggestions. Please try again.',
    };
  }
}

async function handleProjectsCommand(userId: string): Promise<SlackCommandResponse> {
  try {
    const projects = await getProjectsByUserId(userId);

    if (projects.length === 0) {
      return {
        response_type: 'ephemeral',
        text: 'No projects yet. Create one in Catalyst Launch!',
      };
    }

    const projectBlocks = projects.slice(0, 5).map((project) => {
      const completed = project.milestones?.filter((m) => m.isCompleted).length || 0;
      const total = project.milestones?.length || 0;
      const progress = total > 0 ? Math.round((completed / total) * 100) : 0;

      return {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `*${project.name}*\nStage: ${project.stage} | Progress: ${progress}% (${completed}/${total} milestones)`,
        },
      };
    });

    return {
      response_type: 'ephemeral',
      text: `Your Projects (${projects.length})`,
      blocks: [
        {
          type: 'header',
          text: {
            type: 'plain_text',
            text: `Your Projects (${projects.length})`,
          },
        },
        ...projectBlocks,
      ],
    };
  } catch (error) {
    console.error('Error fetching projects for Slack:', error);
    return {
      response_type: 'ephemeral',
      text: 'Failed to fetch projects. Please try again.',
    };
  }
}
